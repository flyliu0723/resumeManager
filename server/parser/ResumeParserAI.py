#!/usr/bin/env python3
"""
ResumeParser API Service - 使用本地AI模型
"""

import os
import sys
import uuid
import tempfile
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# 设置 Django 环境
BASE_DIR = os.path.join(os.path.dirname(__file__), 'resume_parser')
sys.path.insert(0, BASE_DIR)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'resume_parser.settings')

# 初始化 Django
try:
    import django
    django.setup()
    DJANGO_LOADED = True
except Exception as e:
    print(f"Django 初始化失败: {e}")
    DJANGO_LOADED = False

class FallbackParser:
    """备用解析器 - 增强版"""
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
        
        # 邮箱
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, resume_text)
        if emails:
            info["email"] = emails[0]
        
        # 电话
        phone_pattern = r'(?:\+?86)?1[3-9]\d{9}'
        phones = re.findall(phone_pattern, resume_text)
        if phones:
            info["mobile_number"] = phones[0]
        
        # 技能
        info["skills"] = self._extract_skills(resume_text)
        
        # 教育背景
        info["education"] = self._extract_education(resume_text)
        
        # 工作经历
        info["experience"] = self._extract_experience(resume_text)
        
        # 公司
        info["company_names"] = self._extract_companies(resume_text)
        
        return info

    def _extract_name(self, text):
        import re
        patterns = [
            r'姓\s*名[：:\s]*([^\s\u4e00-\u9fa5]{1,10})',
            r'Name[：:]\s*([^\s]+)',
            r'^([\u4e00-\u9fa5]{2,4})$',
            r'应聘者[：:]\s*([^\s]+)',
            r'候选人[：:]\s*([^\s]+)',
        ]
        for line in text.split('\n')[:20]:
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
            'PHP', 'Ruby', 'Swift', 'Kotlin', 'Scala', 'R',
            'React', 'Vue', 'Angular', 'Next.js', 'Node.js', 'Nuxt',
            'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Express',
            'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite',
            'Docker', 'Kubernetes', 'Jenkins', 'GitLab', 'GitHub Actions',
            'AWS', 'Azure', 'GCP', 'Aliyun', 'Tencent Cloud',
            'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras',
            'NLP', 'Computer Vision', 'OpenCV',
            'Git', 'Linux', 'Nginx', 'Apache', 'Kafka', 'RabbitMQ',
            'RESTful API', 'GraphQL', 'Microservices', 'Agile', 'Scrum',
        ]
        for skill in common_skills:
            if re.search(r'\b' + re.escape(skill) + r'\b', text, re.IGNORECASE):
                if skill not in skills:
                    skills.append(skill)
        return skills

    def _extract_education(self, text):
        import re
        patterns = [
            r'(?:教育(?:背景|经历)?[：:\s]*)([^\n]{10,200})',
            r'(?:毕业|就读)于[：:\s]*([^\n]{10,200})',
            r'(?:学历[：:\s]*)([^\n]{10,200})',
            r'(\d{4}[-–至]\d{4}[^\n]{5,100})',
        ]
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()
        return None

    def _extract_experience(self, text):
        import re
        keywords = ['工作经历', '职业经历', '任职经历', '工作经验', '项目经历']
        lines = text.split('\n')
        for i, line in enumerate(lines):
            if any(kw in line for kw in keywords):
                exp_lines = []
                for j in range(i + 1, min(i + 15, len(lines))):
                    line_content = lines[j].strip()
                    if not line_content:
                        continue
                    if any(kw in line_content for kw in keywords):
                        break
                    exp_lines.append(line_content)
                    if len(exp_lines) >= 10:
                        break
                if exp_lines:
                    return '\n'.join(exp_lines)
        return None

    def _extract_companies(self, text):
        import re
        patterns = [
            r'(?:公司|企业|集团|有限公司)[^\n]{2,40}',
            r'(?:任职|就职|工作)于[：:\s]*([^\n]{5,50})',
        ]
        companies = []
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                company = match.group(1).strip() if match.group(1) else match.group(0).strip()
                company = re.sub(r'\s+', ' ', company)
                if 2 < len(company) < 50 and company not in companies:
                    companies.append(company)
        return companies[:5]

def try_ai_parse(text):
    """尝试使用AI解析"""
    if not DJANGO_LOADED:
        print("Django 未加载，无法使用 AI")
        return None
    
    try:
        from parser_app.ai_service import get_resume_insights
        print("调用 AI 解析服务...")
        result = get_resume_insights(text)
        if result:
            print(f"AI 解析成功，返回 {len(str(result))} 字符")
            return result
        else:
            print("AI 解析返回空结果")
    except ImportError as e:
        print(f"AI 模块导入失败: {e}")
    except Exception as e:
        print(f"AI 解析异常: {e}")
    return None

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
                max_pages = min(len(reader.pages), 10)
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
            print('='*50)
            
            text = read_file_content(temp_file, file_extension)
            print(f"提取文本长度: {len(text)} 字符")
            
            if not text or len(text.strip()) < 10:
                return jsonify({
                    "success": False, 
                    "error": "无法提取足够的文本内容"
                }), 400

            # 优先尝试 AI 解析
            ai_result = try_ai_parse(text)
            
            if ai_result:
                print("使用 AI 解析结果")
                extracted_info = ai_result
                parser_name = "AI"
                model_name = "Qwen2.5-1.5B"
            else:
                print("使用 Fallback 规则解析")
                extracted_info = FallbackParser().extract_info(text)
                parser_name = "Fallback"
                model_name = "rule-based"

            # 统一字段名
            result_data = {
                "candidateName": extracted_info.get("name") or extracted_info.get("candidateName") or "未知",
                "email": extracted_info.get("email"),
                "mobile": extracted_info.get("mobile_number") or extracted_info.get("mobile"),
                "skills": extracted_info.get("skills") or [],
                "education": extracted_info.get("education"),
                "experience": extracted_info.get("experience"),
                "companies": extracted_info.get("company_names") or extracted_info.get("companies") or [],
            }

            result = {
                "success": True,
                "data": {
                    **result_data,
                    "rawText": text[:2000] if text else "",
                    "parser": "resume-parser-ai",
                    "parsedAt": datetime.now().isoformat()
                },
                "metadata": {
                    "fileName": file.filename,
                    "fileSize": os.path.getsize(temp_file) if os.path.exists(temp_file) else 0,
                    "parser": f"ResumeParser {parser_name}",
                    "model": model_name
                }
            }

            print(f"\n解析完成:")
            print(f"  姓名: {result_data['candidateName']}")
            print(f"  邮箱: {result_data['email']}")
            print(f"  技能: {result_data['skills']}")
            print(f"  教育: {result_data['education']}")
            print(f"  经历: {result_data['experience'][:50] if result_data['experience'] else '无'}...")
            print(f"  解析器: {parser_name}, 模型: {model_name}")
            print('='*50 + '\n')

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
    models_dir = os.path.join(BASE_DIR, 'models')
    model_file = os.path.join(models_dir, 'qwen2.5-1.5b-instruct-q4_k_m.gguf')
    model_exists = os.path.exists(model_file)
    model_size = os.path.getsize(model_file) / (1024 * 1024 * 1024) if model_exists else 0
    
    return jsonify({
        "status": "healthy",
        "django_loaded": DJANGO_LOADED,
        "model_exists": model_exists,
        "model_size_gb": round(model_size, 2),
        "models_dir": models_dir,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("=" * 50)
    print("ResumeParser API Service")
    print("=" * 50)
    print(f"Django 加载: {'成功' if DJANGO_LOADED else '失败'}")
    
    models_dir = os.path.join(BASE_DIR, 'models')
    model_file = os.path.join(models_dir, 'qwen2.5-1.5b-instruct-q4_k_m.gguf')
    
    if os.path.exists(model_file):
        size = os.path.getsize(model_file) / (1024 * 1024 * 1024)
        print(f"模型文件: 已存在 ({size:.2f} GB)")
    else:
        print("模型文件: 不存在")
        print("  下载地址: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF")
        print(f"  保存位置: {model_file}")
    
    if DJANGO_LOADED and os.path.exists(model_file):
        print("\n[状态] AI 解析已就绪!")
    else:
        print("\n[状态] 将使用规则解析")
    
    print("=" * 50)
    print("服务地址: http://localhost:5001")
    print("=" * 50)
    
    app.run(host='0.0.0.0', port=5001, debug=False)
