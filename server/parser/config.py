"""
AI Parser Config - 配置管理模块
支持从本地文件和远程 Node.js API 获取配置
"""

import os
import yaml
import requests
import threading

class Config:
    """配置管理器"""

    _instance = None
    _config = None
    _remote_config = None
    _remote_config_loaded = False
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._load_config()
        return cls._instance

    def _load_config(self):
        """加载配置文件"""
        config_path = os.path.join(os.path.dirname(__file__), 'config.yaml')

        default_config = {
            'openai': {
                'api_key': '',
                'api_url': 'https://api.openai.com/v1',
                'model': 'gpt-3.5-turbo'
            },
            'ollama': {
                'url': 'http://localhost:11434',
                'model': 'qwen2.5:1.5b'
            },
            'parser': 'auto',
            'fallback': {
                'enabled': True
            }
        }

        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = yaml.safe_load(f) or {}
                self._config = {**default_config, **user_config}
            except Exception as e:
                print(f"加载配置失败: {e}，使用默认配置")
                self._config = default_config
        else:
            self._config = default_config

    def fetch_remote_config(self, api_url='http://localhost:3000', timeout=5):
        """从 Node.js 后端获取活跃配置"""
        try:
            response = requests.get(
                f"{api_url}/api/ai-configs/active/current",
                timeout=timeout
            )
            if response.status_code == 200:
                result = response.json()
                if result.get('success') and result.get('data'):
                    with self._lock:
                        self._remote_config = result['data']
                        self._remote_config_loaded = True
                    print(f"已加载远程配置: {self._remote_config.get('name')} ({self._remote_config.get('provider')})")
                    return True
        except requests.exceptions.RequestException as e:
            print(f"获取远程配置失败: {e}")
        except Exception as e:
            print(f"解析远程配置失败: {e}")
        return False

    def _get_remote_openai_config(self):
        """获取远程 OpenAI 配置"""
        if self._remote_config and self._remote_config.get('provider') == 'openai':
            return {
                'api_key': self._remote_config.get('api_key', ''),
                'api_url': self._remote_config.get('api_url', 'https://api.openai.com/v1'),
                'model': self._remote_config.get('model', 'gpt-3.5-turbo')
            }
        return None

    def _get_remote_ollama_config(self):
        """获取远程 Ollama 配置"""
        if self._remote_config and self._remote_config.get('provider') == 'ollama':
            return {
                'url': self._remote_config.get('api_url', 'http://localhost:11434'),
                'model': self._remote_config.get('model', 'qwen2.5:1.5b')
            }
        return None

    @property
    def openai(self):
        """OpenAI 配置（优先使用远程配置）"""
        remote = self._get_remote_openai_config()
        if remote is not None:
            return remote
        return self._config.get('openai', {}) or {}

    @property
    def ollama(self):
        """Ollama 配置（优先使用远程配置）"""
        remote = self._get_remote_ollama_config()
        if remote is not None:
            return remote
        return self._config.get('ollama', {}) or {}

    @property
    def parser(self):
        """选择的解析器: openai, ollama, auto"""
        if self._remote_config:
            provider = self._remote_config.get('provider', 'auto')
            if provider == 'openai':
                return 'openai'
            elif provider == 'ollama':
                return 'ollama'
        return self._config.get('parser', 'auto')

    @property
    def fallback_enabled(self):
        """是否启用备用解析器"""
        return self._config.get('fallback', {}).get('enabled', True)

    def get_openai_key(self):
        """获取 OpenAI API Key"""
        return self.openai.get('api_key', '')

    def is_openai_configured(self):
        """检查是否配置了 OpenAI"""
        return bool(self.get_openai_key())

    def is_ollama_available(self):
        """检查 Ollama 是否可用"""
        return bool(self.ollama.get('url'))

    def get_parser_priority(self):
        """获取解析器优先级"""
        if self._remote_config:
            provider = self._remote_config.get('provider')
            if provider == 'openai':
                return ['openai']
            elif provider == 'ollama':
                return ['ollama']

        if self.parser == 'openai' and self.is_openai_configured():
            return ['openai', 'ollama']
        elif self.parser == 'ollama':
            return ['ollama']
        elif self.parser == 'auto':
            if self.is_openai_configured():
                return ['openai', 'ollama']
            else:
                return ['ollama']
        return ['ollama']

# 全局配置实例
config = Config()

def get_config():
    """获取配置实例"""
    return config
