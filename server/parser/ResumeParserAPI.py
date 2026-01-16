#!/usr/bin/env python3
"""
ResumeParser API Service
基于OmkarPathak/ResumeParser的本地AI简历解析服务
"""

import os
import sys
import json
import uuid
import tempfile
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

# 导入ResumeParser模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'resume_parser'))

try:
    from resume_parser import ResumeParser
    PARSER_AVAILABLE = True
except ImportError:
    print("Warning: ResumeParser not available, using fallback parser")
    PARSER_AVAILABLE = False

app = Flask(__name__)
CORS(app)

class FallbackParser:
    """备用解析器，当ResumeParser不可用时使用"""

    def extract_info(self, resume_text):
        """基于规则提取基本信息"""
        info = {
            "name": "未知",
            "email": None,
            "mobile_number": None,
            "skills": [],
            "education": None,
            "experience": None,
            "company_names": []
        }

        # 提取邮箱
        import re
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, resume_text)
        if emails:
            info["email"] = emails[0]

        # 提取电话
        phone_pattern = r'(?:\+?86)?1[3-9]\d{9}|(?:\+?86)?\d{3,4}[-\s]?\d{7,8}'
        phones = re.findall(phone_pattern, resume_text)
        if phones:
            info["mobile_number"] = phones[0]

        # 提取技能
        common_skills = [
            'Python', 'Java', 'JavaScript', 'C++', 'C#', 'Go', 'Rust',
            'React', 'Vue', 'Angular', 'Node.js', 'Django', 'Flask',
            'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
            'Machine Learning', 'Deep Learning', 'NLP',
            'Git', 'Linux', 'Agile', 'Scrum'
        ]

        for skill in common_skills:
            if skill.lower() in resume_text.lower():
                info["skills"].append(skill)

        return info

# 初始化解析器
if PARSER_AVAILABLE:
    parser = ResumeParser()
else:
    parser = FallbackParser()

@app.route('/api/parse', methods=['POST'])
def parse_resume():
    """解析简历"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files['file']

        # 保存临时文件
        temp_dir = tempfile.gettempdir()
        file_id = str(uuid.uuid4())
        file_extension = os.path.splitext(file.filename)[1] or '.pdf'
        temp_file = os.path.join(temp_dir, f"{file_id}{file_extension}")

        file.save(temp_file)

        try:
            # 读取文件内容
            if file_extension.lower() == '.pdf':
                import PyPDF2
                with open(temp_file, 'rb') as f:
                    reader = PyPDF2.PdfReader(f)
                    text = ' '.join(page.extract_text() for page in reader.pages[:5])
            else:
                with open(temp_file, 'r', encoding='utf-8') as f:
                    text = f.read()

            # 提取信息
            if PARSER_AVAILABLE:
                # 使用ResumeParser
                extracted_info = parser.get_extracted_data(text)
            else:
                # 使用备用解析器
                extracted_info = parser.extract_info(text)

            # 构建响应
            result = {
                "success": True,
                "data": {
                    "candidateName": extracted_info.get("name", "未知"),
                    "email": extracted_info.get("email"),
                    "mobile": extracted_info.get("mobile_number"),
                    "skills": extracted_info.get("skills", []),
                    "education": extracted_info.get("education"),
                    "experience": extracted_info.get("experience"),
                    "companies": extracted_info.get("company_names", []),
                    "rawText": text[:2000],  # 限制文本长度
                    "parser": "resume-parser-ai",
                    "parsedAt": datetime.now().isoformat()
                },
                "metadata": {
                    "fileName": file.filename,
                    "fileSize": os.path.getsize(temp_file),
                    "parser": "ResumeParser AI",
                    "model": "qwen2.5-1.5b-instruct" if PARSER_AVAILABLE else "rule-based"
                }
            }

            return jsonify(result)

        finally:
            # 清理临时文件
            if os.path.exists(temp_file):
                os.remove(temp_file)

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        "status": "healthy",
        "parserAvailable": PARSER_AVAILABLE,
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    print("Starting ResumeParser API Service...")
    print(f"ResumeParser available: {PARSER_AVAILABLE}")
    app.run(host='0.0.0.0', port=5001, debug=False)
