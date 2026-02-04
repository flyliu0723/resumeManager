/**
 * 技能同义词库
 * 用于简历-职位匹配时的语义扩展
 * 
 * 权重配置（代码中写死）：
 * - 技能匹配：50%
 * - 经验匹配：30%
 * - 学历匹配：10%
 * - 基础分：10%
 * 
 * 及格线：60分
 */

const SKILL_SYNONYMS = {
  // 前端技术
  "React": {
    synonyms: ["React.js", "ReactJS", "React Native", "Next.js", "React Hook"],
    category: "前端框架"
  },
  "Vue": {
    synonyms: ["Vue.js", "VueJS", "Vue 2", "Vue 3", "Nuxt.js", "Vuex", "Pinia"],
    category: "前端框架"
  },
  "Angular": {
    synonyms: ["AngularJS", "Angular 2+", "Ng"],
    category: "前端框架"
  },
  "构建工具": {
    synonyms: ["Webpack", "Vite", "Rollup", "Parcel", "esbuild", "Gulp", "Grunt"],
    category: "工程化"
  },
  "性能优化": {
    synonyms: ["Webpack", "Vite", "代码分割", "懒加载", "CDN", "性能调优", "首屏优化", "Tree Shaking"],
    category: "工程化"
  },
  "CSS": {
    synonyms: ["Sass", "Less", "Stylus", "PostCSS", "CSS3", "Tailwind CSS", "Styled Components"],
    category: "前端技术"
  },
  
  // 后端技术
  "Node.js": {
    synonyms: ["Node", "NodeJS", "Express", "Koa", "Nest.js", "Egg.js", "Fastify"],
    category: "后端框架"
  },
  "Java": {
    synonyms: ["Spring", "Spring Boot", "Spring Cloud", "JavaEE", "Jakarta EE", "MyBatis", "Hibernate"],
    category: "后端语言"
  },
  "Python": {
    synonyms: ["Django", "Flask", "FastAPI", "Tornado", "Pyramid"],
    category: "后端语言"
  },
  "Go": {
    synonyms: ["Golang", "Gin", "Beego", "Echo", "GoFrame"],
    category: "后端语言"
  },
  "微服务": {
    synonyms: ["Docker", "Kubernetes", "K8s", "Service Mesh", "Istio", "gRPC", "RPC"],
    category: "架构"
  },
  
  // 数据库
  "关系型数据库": {
    synonyms: ["MySQL", "PostgreSQL", "Oracle", "SQL Server", "SQLite", "MariaDB"],
    category: "数据库"
  },
  "NoSQL": {
    synonyms: ["MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB", "Neo4j"],
    category: "数据库"
  },
  "缓存": {
    synonyms: ["Redis", "Memcached", "本地缓存", "CDN缓存"],
    category: "数据库"
  },
  
  // 移动端
  "移动端": {
    synonyms: ["iOS", "Android", "React Native", "Flutter", "uni-app", "小程序", "Swift", "Kotlin"],
    category: "移动端"
  },
  "小程序": {
    synonyms: ["微信小程序", "支付宝小程序", "字节小程序", "Uni-app"],
    category: "移动端"
  },
  
  // 云服务 & DevOps
  "云服务": {
    synonyms: ["AWS", "阿里云", "腾讯云", "Azure", "GCP", "华为云", "百度云"],
    category: "云服务"
  },
  "DevOps": {
    synonyms: ["CI/CD", "Jenkins", "GitLab CI", "GitHub Actions", "Travis CI", "CircleCI"],
    category: "DevOps"
  },
  "版本控制": {
    synonyms: ["Git", "SVN", "Mercurial", "GitLab", "GitHub", "Bitbucket"],
    category: "工具"
  },
  
  // 测试
  "测试": {
    synonyms: ["单元测试", "集成测试", "E2E测试", "Jest", "Mocha", "Cypress", "Selenium", "JUnit"],
    category: "测试"
  },
  
  // 数据 & AI
  "数据分析": {
    synonyms: ["Pandas", "NumPy", "SQL", "Excel", "Tableau", "PowerBI", "数据挖掘"],
    category: "数据"
  },
  "人工智能": {
    synonyms: ["机器学习", "深度学习", "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "NLP", "CV"],
    category: "AI"
  }
}

/**
 * 获取技能的同义词列表
 * @param {string} skill - 技能名称
 * @returns {string[]} - 同义词数组（包含原技能）
 */
function getSynonyms(skill) {
  const normalizedSkill = skill.toLowerCase().trim()
  
  // 直接匹配
  for (const [key, value] of Object.entries(SKILL_SYNONYMS)) {
    const allNames = [key, ...value.synonyms].map(s => s.toLowerCase())
    if (allNames.includes(normalizedSkill)) {
      return [key, ...value.synonyms]
    }
  }
  
  // 未找到，返回原技能
  return [skill]
}

/**
 * 检查两个技能是否匹配（精确或同义）
 * @param {string} skill1 - 技能1
 * @param {string} skill2 - 技能2
 * @returns {boolean}
 */
function isSkillMatch(skill1, skill2) {
  const synonyms1 = getSynonyms(skill1).map(s => s.toLowerCase())
  const synonyms2 = getSynonyms(skill2).map(s => s.toLowerCase())
  
  return synonyms1.some(s1 => synonyms2.includes(s1))
}

/**
 * 获取所有技能类别
 * @returns {Object} - 按类别分组的技能
 */
function getSkillsByCategory() {
  const categories = {}
  
  for (const [skill, data] of Object.entries(SKILL_SYNONYMS)) {
    if (!categories[data.category]) {
      categories[data.category] = []
    }
    categories[data.category].push({
      name: skill,
      synonyms: data.synonyms
    })
  }
  
  return categories
}

/**
 * 添加新的同义词映射（运行时）
 * @param {string} skill - 主技能名
 * @param {string[]} synonyms - 同义词数组
 * @param {string} category - 类别
 */
function addSynonym(skill, synonyms, category = "其他") {
  SKILL_SYNONYMS[skill] = {
    synonyms: synonyms.filter(s => s !== skill),
    category
  }
}

/**
 * 批量导入同义词（JSON格式）
 * @param {Object} data - 同义词数据对象
 */
function importSynonyms(data) {
  for (const [skill, skillData] of Object.entries(data)) {
    if (typeof skillData === 'object' && skillData.synonyms) {
      SKILL_SYNONYMS[skill] = {
        synonyms: skillData.synonyms,
        category: skillData.category || "其他"
      }
    }
  }
}

/**
 * 导出所有同义词（用于保存）
 * @returns {Object}
 */
function exportSynonyms() {
  return JSON.parse(JSON.stringify(SKILL_SYNONYMS))
}

module.exports = {
  SKILL_SYNONYMS,
  getSynonyms,
  isSkillMatch,
  getSkillsByCategory,
  addSynonym,
  importSynonyms,
  exportSynonyms
}
