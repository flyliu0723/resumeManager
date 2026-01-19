#!/usr/bin/env python3
"""
Download ResumeParser AI Models
Supports resume and continue, more reliable
"""

import os
import sys
import subprocess

def check_ollama():
    """检查是否可以使用 Ollama（更简单的方案）"""
    print("=" * 60)
    print("选项1: 使用 Ollama（推荐，最简单）")
    print("=" * 60)
    print("Ollama 是一个本地 AI 模型运行工具，安装和使用都很简单")
    print()
    print("安装步骤:")
    print("  1. 下载: https://ollama.com/download")
    print("  2. 安装后运行: ollama run qwen2.5:1.5b")
    print()
    
def download_with_huggingface_cli():
    """使用 huggingface-cli 下载（最可靠）"""
    print("=" * 60)
    print("选项2: 使用 HuggingFace CLI")
    print("=" * 60)
    
    # 检查是否安装了 huggingface-cli
    try:
        result = subprocess.run(['pip', 'show', 'huggingface-cli'], capture_output=True, text=True)
        if result.returncode != 0:
            print("安装 huggingface-cli...")
            subprocess.run(['pip', 'install', 'huggingface-cli', '-q'])
    except:
        pass
    
    print("下载命令:")
    print("  huggingface-cli download Qwen/Qwen2.5-1.5B-Instruct-GGUF --local-dir D:\\练手\\resume1\\server\\parser\\resume_parser\\models")
    print()
    print("或者手动下载:")
    print("  1. 访问: https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF")
    print("  2. 下载文件: qwen2.5-1.5b-instruct-q4_k_m.gguf")
    print("  3. 保存到: D:\\练手\\resume1\\server\\parser\\resume_parser\\models\\")
    print()

def download_sentence_transformer():
    """下载 Sentence Transformer"""
    print("=" * 60)
    print("下载 Sentence Transformer 模型")
    print("=" * 60)
    try:
        from sentence_transformers import SentenceTransformer
        print("下载中 (约10MB)...")
        SentenceTransformer('all-MiniLM-L6-v2')
        print("✓ 完成")
    except Exception as e:
        print(f"✗ 失败: {e}")
        print("  解决方案: pip install sentence-transformers")
    print()

def manual_download_instructions():
    """手动下载说明"""
    print("=" * 60)
    print("手动下载步骤")
    print("=" * 60)
    print()
    print("1. 访问 HuggingFace:")
    print("   https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF")
    print()
    print("2. 点击 Files 标签页")
    print()
    print("3. 下载文件: qwen2.5-1.5b-instruct-q4_k_m.gguf")
    print("   (约 950MB)")
    print()
    print("4. 创建目录并移动文件:")
    print("   mkdir D:\\练手\\resume1\\server\\parser\\resume_parser\\models")
    print("   move qwen2.5-1.5b-instruct-q4_k_m.gguf D:\\练手\\resume1\\server\\parser\\resume_parser\\models\\")
    print()
    print("5. 完成后重启 ResumeParserAPI.py")
    print()

if __name__ == '__main__':
    print()
    print("╔" + "=" * 58 + "╗")
    print("║" + " " * 15 + "ResumeParser 模型下载工具" + " " * 15 + "║")
    print("╚" + "=" * 58 + "╝")
    print()
    
    # 检查现有模型
    models_dir = os.path.join(os.path.dirname(__file__), 'resume_parser', 'models')
    model_file = os.path.join(models_dir, 'qwen2.5-1.5b-instruct-q4_k_m.gguf')
    
    if os.path.exists(model_file):
        size = os.path.getsize(model_file) / (1024 * 1024 * 1024)
        print(f"✓ 模型已存在: {model_file}")
        print(f"  大小: {size:.2f} GB")
    else:
        print("✗ 模型未找到")
        print(f"  期望位置: {model_file}")
        print()
        manual_download_instructions()
    
    print()
    download_sentence_transformer()
    
    print()
    print("=" * 60)
    print("下载完成后，重启 ResumeParserAPI.py 即可使用 AI 解析")
    print("=" * 60)
