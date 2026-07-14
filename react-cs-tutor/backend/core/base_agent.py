import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

import os
import re
import ssl
import urllib3
import httpx
import requests
from openai import OpenAI
from dotenv import load_dotenv
from typing import List,Dict,Any

# 禁用SSL证书验证（仅用于开发环境）
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
ssl._create_default_https_context = ssl._create_unverified_context
# requests库使用自己的证书包，需要单独处理
_old_request = requests.Session.request
def _patched_request(self, *args, **kwargs):
    kwargs.setdefault('verify', False)
    return _old_request(self, *args, **kwargs)
requests.Session.request = _patched_request
# httpx库也需要处理（OpenAI客户端内部使用httpx）
_httpx_client = httpx.Client(verify=False) # 创建一个不验证SSL证书的httpx客户端

load_dotenv()

class BaseAgent:

    def __init__(self,model : str = None,api_key : str = None,base_url : str = None,timeout : int = None):
        self.model = model or os.getenv("LLM_MODEL")
        self.api_key = api_key or os.getenv("LLM_API_KEY")
        self.base_url = base_url or os.getenv("LLM_BASE_URL")
        self.timeout = timeout or int(os.getenv("LLM_TIMEOUT",50))

        if not all ([self.model,self.api_key,self.base_url]):
            raise ValueError("模型ID、API密钥和URL必须提供")
        
        self.client = OpenAI(api_key = self.api_key,base_url = self.base_url,timeout = self.timeout,http_client = _httpx_client)

    def thinking_stream(self, messages : List[Dict[str,str]], temperature : float = 0) -> str:
        """
        调用大预言模型进行思考 -> 流式输出
        """
        print(f"---正在调用{self.model}进行思考---")
        try:
            response = self.client.chat.completions.create(
                model = self.model,
                messages = messages,
                temperature = temperature,
                stream = True
            ) # 一个可迭代的生成器，逐步产生多个ChatCompletionChunk对象，返回类型Stream[ChatCompletionChunk]
            print("---调用LLM成功---")
            collected_content = []
            
            # chunk表示LLM输出的一小段增量内容，类型是ChatCompletionChunk
            for chunk in response:
                # chunk.choices返回的是一个列表，包含模型生成的候选元素，绝大多数情况下只有一个元素
                if not chunk.choices:
                    continue
                # chunk.choices[0].delta.content表示LLM生成的文本内容，类型是str
                content = chunk.choices[0].delta.content or ""
                print(content,end="",flush=True)
                collected_content.append(content)
            print()
            return "".join(collected_content)

        except Exception as e:
            print(f"调用LLM时出现了错误{e}")
            return None

    def thinking(self, message : List[Dict[str,str]], 
                        tools: List[Dict[str,str]], 
                        tool_choice : str = "auto",
                        temperature : float = 0
                    ):
            """
            调用大预言模型进行思考 -> 非流式输出
            """
            print(f"---正在调用{self.model}进行思考---")
            try:
                response = self.client.chat.completions.create(
                    model = self.model,
                    messages = message,
                    tools = tools,
                    tool_choice = tool_choice,
                    temperature = temperature,
                    stream = False
                )
                print("---调用LLM成功---")
                return response.choices[0].message
            except Exception as e:
                print(f"调用模型{self.model}时出现了错误{e}")
                return None
