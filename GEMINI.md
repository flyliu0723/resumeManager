全栈开发规范指南 (Vue3 + Node.js)
一、 前端开发规范 (Vue3 + TS + SCSS)
1. 核心架构习惯
组件模式：全面采用 <script setup> 语法。逻辑复杂的组件必须将业务逻辑拆分至 composables 文件夹中，保持组件模板的简洁。
命名约定：组件文件使用大驼峰（PascalCase），例如 UserDashboard.vue。在模板中引用组件时同样保持大驼峰，以区别于原生 HTML 标签。
类型驱动：禁止在代码中使用 any。所有 API 请求的响应数据、组件 Props、以及全局状态都必须定义对应的 interface 或 type。

2. 样式管理 (SCSS)
层级控制：选择器嵌套深度严禁超过 3 层。过深的嵌套会导致样式难以覆盖且性能下降。
全局变量：基础色值、边距尺寸、字体大小应统一存放在 src/assets/styles/variables.scss，通过预处理器配置全局注入，避免在业务代码中出现硬编码的颜色值。
方法论：推荐使用 BEM 命名思路或简单的类名前缀，确保样式在作用域（scoped）之外也不会产生意料之外的冲突。

二、 后端开发规范 (Node.js)
1. 逻辑分层
控制器 (Controller)：只负责解析参数、调用服务层、返回响应。不要在此处编写具体的 SQL 或业务算法。
服务层 (Service)：承载核心业务逻辑。所有的外部调用、复杂计算、多表事务应在此处完成，确保逻辑的可测试性。
数据层 (Model)：负责数据库 schema 定义及基础的增删改查方法。

2. 统一接口契约
响应结构：所有接口必须返回一致的 JSON 格式，如下所示：
{
  "code": 200, 
  "data": {}, 
  "message": "success"
}
异常处理：严禁在业务逻辑中到处填充 try...catch。应当建立全局错误处理中间件，通过抛出自定义错误对象（含 HTTP 状态码）来统一管理报错日志。

三、 工程化与 Git 协作
1. 目录结构参考

project-root
├── client (Vue3)
│   ├── src
│   │   ├── api          # 接口请求封装
│   │   ├── components   # 通用 UI 组件
│   │   ├── composables  # 逻辑提取
│   │   └── types        # 全局 TS 类型
├── server (Node.js)
│   ├── src
│   │   ├── controllers
│   │   ├── services
│   │   └── middlewares
└── .opencode.md
2. 代码提交规范
Commit 格式：采用 type: description 风格。
feat: 新功能
fix: 修复 Bug
docs: 文档更新
refactor: 代码重构（不影响功能的变动）
强制校验：提交前必须通过 ESLint 静态检查。建议在 Opencode 环境中配置 Prettier，确保不同项目间的代码风格完全统一。