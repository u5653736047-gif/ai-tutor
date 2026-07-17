/// <reference types="vite/client" />

// 声明环境变量类型(用于 API 基础地址配置)
interface ImportMetaEnv {
  readonly VITE_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
