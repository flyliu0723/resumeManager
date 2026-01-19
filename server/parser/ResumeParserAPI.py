#!/usr/bin/env python3
"""
ResumeParser API Service - 统一 AI 解析接口
支持 OpenAI API 和 Ollama 本地模型
"""

import os
import sys
import json
import uuid
import tempfile
import requests
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

from config import get_config

app = Flask(__name__)
CORS(app)

# 加载配置
config = get_config()

PROMPT_TEMPLATE = """你是一个简历解析专家。请从以下简历文本中提取信息，返回JSON格式：

简历文本：
{text}

请提取以下信息（如果找不到某项信息，设置为null）：
{{
  "name": "姓名",
  "email": "邮箱地址", 
  "mobile": "电话号码",
  "skills": ["技能列表"],
  "education": "教育背景",
  "experience": "工作经历",
  "companies": ["公司名称列表"]
}}

只返回JSON，不要其他内容。"""

def parse_with_openai(text):
    """使用 OpenAI API 解析"""
    openai_config = config.openai
    api_key = openai_config.get('api_key')
    api_url = openai_config.get('api_url')
    model = openai_config.get('model', 'gpt-3.5-turbo')
    
    if not api_key:
        print("未配置 OpenAI API Key")
        return None
    
    try:
        prompt = PROMPT_TEMPLATE.format(text=text[:2000])
        
        response = requests.post(
            f"{api_url}/chat/completions",
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}'
            },
            json={
                'model': model,
                'messages': [
                    {'role': 'system', 'content': '你是一个简历解析专家，擅长提取简历中的关键信息。只返回JSON格式。'},
                    {'role': 'user', 'content': prompt}
                ],
                'temperature': 0.3,
                'max_tokens': 1000
            },
            timeout=60
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # 清理 JSON
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            elif content.startswith('```'):
                content = content[3:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            parsed = json.loads(content)
            return parsed
        else:
            print(f"OpenAI API 错误: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"OpenAI 解析失败: {e}")
        return None

def parse_with_ollama(text):
    """使用 Ollama 本地模型解析"""
    ollama_config = config.ollama
    ollama_url = ollama_config.get('url', 'http://localhost:11434')
    model = ollama_config.get('model', 'qwen2.5:1.5b')
    
    try:
        prompt = PROMPT_TEMPLATE.format(text=text[:1500])
        
        response = requests.post(
            f"{ollama_url}/api/generate",
            json={
                'model': model,
                'prompt': prompt,
                'stream': False,
                'format': 'json',
                'options': {
                    'temperature': 0.3,
                    'num_predict': 1000
                }
            },
            timeout=180
        )
        
        if response.status_code == 200:
            result = response.json()
            content = result.get('response', '')
            
            # 清理 JSON
            content = content.strip()
            if content.startswith('```json'):
                content = content[7:]
            if content.endswith('```'):
                content = content[:-3]
            content = content.strip()
            
            parsed = json.loads(content)
            return parsed
        else:
            print(f"Ollama 错误: {response.status_code}")
            return None
            
    except Exception as e:
        print(f"Ollama 解析失败: {e}")
        return None

def ai_parse(text):
    """统一 AI 解析接口 - 自动选择解析器"""
    parser_priority = config.get_parser_priority()
    
    print(f"\n使用 AI 解析，优先级: {parser_priority}")
    
    for parser in parser_priority:
        if parser == 'openai' and config.is_openai_configured():
            print("尝试 OpenAI...")
            result = parse_with_openai(text)
            if result:
                return result, 'OpenAI', config.openai.get('model', 'gpt-3.5-turbo')
        
        elif parser == 'ollama':
            print("尝试 Ollama...")
            result = parse_with_ollama(text)
            if result:
                return result, 'Ollama', config.ollama.get('model', 'qwen2.5:1.5b')
    
    return None, None, None

class FallbackParser:
    """备用解析器 - 基于规则"""
    def extract_info(self, resume_text):
        import re
        info = {
            "name": self._extract_name(resume_text),
            "email": None,
            "mobile_number": None,
            "skills": [],
            "education": None,
            "experience": None,
            "company_names": []
        }
        
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, resume_text)
        if emails:
            info["email"] = emails[0]
        
        phone_pattern = r'(?:\+?86)?1[3-9]\d{9}'
        phones = re.findall(phone_pattern, resume_text)
        if phones:
            info["mobile_number"] = phones[0]
        
        info["skills"] = self._extract_skills(resume_text)
        info["education"] = self._extract_education(resume_text)
        info["experience"] = self._extract_experience(resume_text)
        info["company_names"] = self._extract_companies(resume_text)
        
        return info

    def _extract_name(self, text):
        import re
        patterns = [
            r'姓\s*名[：:\s]*([^\s\u4e00-\u9fa5]{1,10})',
            r'Name[：:]\s*([^\s]+)',
            r'^([\u4e00-\u9fa5]{2,4})$',
        ]
        for line in text.split('\n')[:15]:
            line = line.strip()
            if not line or len(line) > 50:
                continue
            for pattern in patterns:
                match = re.search(pattern, line)
                if match:
                    name = match.group(1).strip()
                    if 1 <= len(name) <= 10 and not re.match(r'^\d+$', name):
                        return name
        return "未知"

    def _extract_skills(self, text):
        import re
        skills = []
        common_skills = [
            'Python', 'Java', 'JavaScript', 'TypeScript', 'C++', 'C#', 'Go', 'Rust',
            'React', 'Vue', 'Angular', 'Node.js',
            'Django', 'Flask', 'Spring Boot',
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
            'Docker', 'Kubernetes', 'AWS',
            'Machine Learning', 'Deep Learning',
            'Git', 'Linux',
        ]
        for skill in common_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', text, re.IGNORECASE):
                if skill not in skills:
                    skills.append(skill)
        return skills

    def _extract_education(self, text):
        import re
        patterns = [
            r'(?:教育|学历)[：:\s]*([^\n]{10,200})',
            r'(?:毕业|就读)于[：:\s]*([^\n]{10,200})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_experience(self, text):
        keywords = ['工作经历', '职业经历', '任职', '工作经验']
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if any(kw in line for kw in keywords):
                exp = []
                for j in range(i + 1, min(i + 10, len(lines))):
                    if lines[j].strip():
                        exp.append(lines[j].strip())
                return '\n'.join(exp[:8]) if exp else None
        return None

    def _extract_companies(self, text):
        import re
        patterns = [r'(?:公司|企业|集团)[^\n]{0,30}']
        companies = []
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                company = match.group(0).strip()
                if 2 < len(company) < 50 and company not in companies:
                    companies.append(company)
        return companies[:5]

def read_file_content(file_path, extension):
    """读取文件内容"""
    import re
    extension = extension.lower()
    
    if extension == '.pdf':
        try:
            import PyPDF2
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                pages_text = []
                max_pages = min(len(reader.pages), 5)
                for i in range(max_pages):
                    try:
                        text = reader.pages[i].extract_text()
                        if text:
                            pages_text.append(text)
                    except:
                        continue
                return ' '.join(pages_text)
        except Exception as e:
            print(f"PDF解析错误: {e}")
            return ""
    
    elif extension in ['.doc', '.docx']:
        try:
            from docx import Document
            doc = Document(file_path)
            return '\n'.join([p.text for p in doc.paragraphs if p.text.strip()])
        except Exception as e:
            print(f"Word解析错误: {e}")
            return ""
    
    else:
        encodings = ['utf-8', 'gbk', 'gb2312', 'latin1']
        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    content = f.read()
                    content = re.sub(r'[\x00-\x1f\x7f]', '', content)
                    return content
            except (UnicodeDecodeError, FileNotFoundError):
                continue
        return ""

@app.route('/api/parse', methods=['POST'])
def parse_resume():
    """解析简历"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']
        
        if not file.filename:
            return jsonify({"error": "Invalid filename"}), 400

        temp_dir = tempfile.gettempdir()
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1] or '.pdf'
        temp_file = os.path.join(temp_dir, f"{file_id}{file_extension}")

        file.save(temp_file)

        try:
            print(f"\n{'='*50}")
            print(f"解析文件: {file.filename}")
            
            text = read_file_content(temp_file, file_extension)
            print(f"提取文本长度: {len(text)} 字符")
            
            if not text or len(text.strip()) < 10:
                return jsonify({
                    "success": False, 
                    "error": "无法提取足够的文本内容"
                }), 400

            # 优先尝试 AI 解析
            ai_result, ai_parser, ai_model = ai_parse(text)
            
            if ai_result:
                print(f"AI 解析成功: {ai_parser}")
                extracted_info = ai_result
                parser_name = ai_parser
                model_name = ai_model
            elif config.fallback_enabled:
                print("使用 Fallback 规则解析")
                extracted_info = FallbackParser().extract_info(text)
                parser_name = "Fallback"
                model_name = "rule-based"
            else:
                return jsonify({
                    "success": False,
                    "error": "AI 解析失败且未启用备用解析器"
                }), 500

            result = {
                "success": True,
                "data": {
                    "candidateName": extracted_info.get("name") or "未知",
                    "email": extracted_info.get("email"),
                    "mobile": extracted_info.get("mobile") or extracted_info.get("mobile_number"),
                    "skills": extracted_info.get("skills") or [],
                    "education": extracted_info.get("education"),
                    "experience": extracted_info.get("experience"),
                    "companies": extracted_info.get("companies") or [],
                    "rawText": text[:2000] if text else "",
                    "parser": "ai-parser",
                    "parsedAt": datetime.now().isoformat()
                },
                "metadata": {
                    "fileName": file.filename,
                    "fileSize": os.path.getsize(temp_file) if os.path.exists(temp_file) else 0,
                    "parser": parser_name,
                    "model": model_name
                }
            }

            print(f"\n解析结果:")
            print(f"  姓名: {result['data']['candidateName']}")
            print(f"  邮箱: {result['data']['email']}")
            print(f"  技能: {result['data']['skills']}")
            print(f"  解析器: {parser_name}, 模型: {model_name}")
            print('='*50)

            return jsonify(result)

        finally:
            if os.path.exists(temp_file):
                os.remove(temp_file)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "healthy",
        "config": {
            "parser": config.parser,
            "openai_configured": config.is_openai_configured(),
            "ollama_url": config.ollama.get('url'),
            "ollama_model": config.ollama.get('model'),
            "fallback_enabled": config.fallback_enabled
        },
        "timestamp": datetime.now().isoformat()
    })

@app.route('/api/config/refresh', methods=['POST'])
def refresh_config():
    """从 Node.js 后端刷新配置"""
    success = config.fetch_remote_config()
    return jsonify({
        "success": success,
        "config": {
            "parser": config.parser,
            "openai_configured": config.is_openai_configured(),
            "openai_model": config.openai.get('model'),
            "ollama_url": config.ollama.get('url'),
            "ollama_model": config.ollama.get('model'),
            "fallback_enabled": config.fallback_enabled
        }
    })

@app.route('/api/config', methods=['GET'])
def get_config_info():
    """获取当前配置"""
    return jsonify({
        "parser": config.parser,
        "config_source": "remote" if config._remote_config else "local",
        "openai": {
            "configured": config.is_openai_configured(),
            "model": config.openai.get('model'),
            "api_url": config.openai.get('api_url')
        },
        "ollama": {
            "url": config.ollama.get('url'),
            "model": config.ollama.get('model')
        },
        "fallback_enabled": config.fallback_enabled
    })

if __name__ == '__main__':
    print("=" * 50)
    print("ResumeParser API Service (Unified)")
    print("=" * 50)
    print(f"解析器模式: {config.parser}")
    print(f"OpenAI 配置: {'是' if config.is_openai_configured() else '否'}")
    print(f"Ollama URL: {config.ollama.get('url')}")
    print(f"Ollama 模型: {config.ollama.get('model')}")
    print(f"备用解析器: {'启用' if config.fallback_enabled else '禁用'}")
    print("=" * 50)

    print("\n正在从 Node.js 后端获取活跃配置...")
    config.fetch_remote_config(api_url='http://localhost:3000', timeout=10)
    print(f"当前解析器: {config.parser}")
    print(f"配置来源: {'远程数据库' if config._remote_config else '本地配置'}")

    print("=" * 50)
    print("服务地址: http://localhost:5001")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5001, debug=False)
