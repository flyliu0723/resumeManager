const { skillResumeIndexStmt, resumeStmt, positionStmt, jdResumeMatchStmt } = require('../database')
const { getSynonyms, isSkillMatch } = require('../constants/skillSynonyms')

// 权重配置（代码中写死）
const WEIGHTS = {
  skill: 0.5,      // 技能匹配：50%
  experience: 0.3, // 经验匹配：30%
  education: 0.1,  // 学历匹配：10%
  base: 0.1        // 基础分：10%
}

// 及格线
const PASSING_SCORE = 60

/**
 * 计算技能匹配分数
 * @param {string[]} jdSkills - JD要求的技能
 * @param {string[]} resumeSkills - 简历具备的技能
 * @returns {Object} { score: number, matched: string[], missing: string[] }
 */
function calculateSkillMatch(jdSkills, resumeSkills) {
  if (!jdSkills || jdSkills.length === 0) {
    return { score: 100, matched: [], missing: [] }
  }

  if (!resumeSkills || resumeSkills.length === 0) {
    return { score: 0, matched: [], missing: jdSkills }
  }

  const matched = []
  const missing = []

  for (const jdSkill of jdSkills) {
    let isMatched = false

    // 1. 精确匹配
    for (const resumeSkill of resumeSkills) {
      if (resumeSkill.toLowerCase() === jdSkill.toLowerCase()) {
        isMatched = true
        break
      }
    }

    // 2. 同义词匹配
    if (!isMatched) {
      for (const resumeSkill of resumeSkills) {
        if (isSkillMatch(jdSkill, resumeSkill)) {
          isMatched = true
          break
        }
      }
    }

    if (isMatched) {
      matched.push(jdSkill)
    } else {
      missing.push(jdSkill)
    }
  }

  // 计算覆盖率（0-100分）
  const coverage = (matched.length / jdSkills.length) * 100

  return {
    score: Math.round(coverage),
    matched,
    missing
  }
}

/**
 * 计算经验匹配分数
 * @param {string} jdExperience - JD经验要求文本
 * @param {string} resumeExperience - 简历经验文本
 * @returns {number} 分数(0-100)
 */
function calculateExperienceMatch(jdExperience, resumeExperience) {
  if (!jdExperience || !resumeExperience) {
    return 50 // 默认中等分数
  }

  // 从JD提取年限要求（如"3-5年"、"5年以上"）
  const jdYears = extractYears(jdExperience)
  const resumeYears = extractYears(resumeExperience)

  if (jdYears === null || resumeYears === null) {
    // 如果没有明确年限，使用关键词匹配
    return calculateKeywordMatch(jdExperience, resumeExperience)
  }

  // 计算年限匹配度
  if (resumeYears >= jdYears.max) {
    return 100
  } else if (resumeYears >= jdYears.min) {
    return 80 + (resumeYears - jdYears.min) / (jdYears.max - jdYears.min) * 20
  } else if (resumeYears >= jdYears.min * 0.7) {
    return 60 + (resumeYears - jdYears.min * 0.7) / (jdYears.min * 0.3) * 20
  } else {
    return Math.max(0, 40 * (resumeYears / jdYears.min))
  }
}

/**
 * 从文本中提取工作年限
 * @param {string} text - 文本
 * @returns {Object|null} { min: number, max: number }
 */
function extractYears(text) {
  if (!text) return null

  // 匹配 "X年以上"、"X-Y年"、"X年" 等模式
  const patterns = [
    /(\d+)\s*[-~至到]\s*(\d+)\s*年/,     // 3-5年、3~5年、3至5年、3到5年
    /(\d+)\s*年\s*及?以?上/,              // 3年以上、3年及以上
    /(\d+)\s*年\s*及?以?下/,              // 3年以下
    /(\d+)\s*年\s*左?右?/,                // 3年左右、3年
    /(\d+)\+?\s*年/,                      // 3年、3+年
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      if (match[2]) {
        // 范围匹配（如 3-5年）
        return { min: parseInt(match[1]), max: parseInt(match[2]) }
      } else {
        // 单一数字（如 3年以上）
        const years = parseInt(match[1])
        if (text.includes('以上') || text.includes('+')) {
          return { min: years, max: years + 5 }
        } else if (text.includes('以下')) {
          return { min: 0, max: years }
        } else {
          return { min: Math.max(1, years - 1), max: years + 2 }
        }
      }
    }
  }

  return null
}

/**
 * 简单的关键词匹配
 * @param {string} text1 - 文本1
 * @param {string} text2 - 文本2
 * @returns {number} 匹配分数(0-100)
 */
function calculateKeywordMatch(text1, text2) {
  if (!text1 || !text2) return 50

  const keywords1 = extractKeywords(text1)
  const keywords2 = extractKeywords(text2)

  if (keywords1.length === 0) return 50

  let matchCount = 0
  for (const keyword of keywords1) {
    if (keywords2.some(k => k.includes(keyword) || keyword.includes(k))) {
      matchCount++
    }
  }

  return Math.round((matchCount / keywords1.length) * 100)
}

/**
 * 提取关键词
 * @param {string} text - 文本
 * @returns {string[]} 关键词数组
 */
function extractKeywords(text) {
  if (!text) return []

  // 移除常见停用词，提取有意义的关键词
  const stopWords = ['的', '了', '和', '与', '或', '在', '有', '是', '年', '月', '日', '及', '等', '相关', '工作', '经验', '要求']

  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && !stopWords.includes(word))
}

/**
 * 检查学历匹配
 * @param {string} jdEducation - JD学历要求
 * @param {string} resumeEducation - 简历学历
 * @returns {number} 分数(0-100)
 */
function checkEducationMatch(jdEducation, resumeEducation) {
  if (!jdEducation || !resumeEducation) {
    return 100 // 如果没有明确要求，默认满分
  }

  const educationLevels = {
    '博士': 5,
    '研究生': 4,
    '硕士': 4,
    '本科': 3,
    '大专': 2,
    '专科': 2,
    '高中': 1,
    '中专': 1,
    '初中': 0
  }

  const jdLevel = getEducationLevel(jdEducation, educationLevels)
  const resumeLevel = getEducationLevel(resumeEducation, educationLevels)

  if (resumeLevel >= jdLevel) {
    return 100
  } else if (resumeLevel >= jdLevel - 1) {
    return 70
  } else if (resumeLevel >= jdLevel - 2) {
    return 40
  } else {
    return 10
  }
}

/**
 * 获取学历等级
 * @param {string} education - 学历文本
 * @param {Object} levels - 学历等级映射
 * @returns {number} 等级
 */
function getEducationLevel(education, levels) {
  const text = education.toLowerCase()

  for (const [key, level] of Object.entries(levels)) {
    if (text.includes(key)) {
      return level
    }
  }

  return 3 // 默认为本科
}

/**
 * 主推荐函数：为JD推荐匹配的简历
 * @param {number} positionId - 职位ID
 * @returns {Promise<Array>} 推荐列表
 */
async function recommendResumesForJD(positionId) {
  // 1. 获取JD解析数据
  const position = positionStmt.getById(positionId)
  if (!position) {
    throw new Error('职位不存在')
  }

  // 检查JD是否已解析
  if (!position.parsed_skills) {
    throw new Error('JD尚未解析，请先解析JD')
  }

  const jdSkills = position.parsed_skills ? JSON.parse(position.parsed_skills) : []
  const jdEducation = position.parsed_education || ''
  const jdExperience = position.parsed_experience || ''

  // 2. 获取所有已解析的简历（有parsed_data字段）
  const allResumes = resumeStmt.getAll()
  const parsedResumes = allResumes.filter(r => r.parsed_data && r.parsed_data.trim() !== '')

  if (parsedResumes.length === 0) {
    return []
  }

  // 3. 遍历计算匹配分数
  const recommendations = []

  for (const resume of parsedResumes) {
    try {
      const parsedData = JSON.parse(resume.parsed_data)

      const resumeSkills = parsedData.skills || []
      const resumeEducation = parsedData.education || ''
      const resumeExperience = parsedData.workExperience || parsedData.experience || ''

      // 计算各项分数
      const skillMatch = calculateSkillMatch(jdSkills, resumeSkills)
      const skillScore = skillMatch.score

      const experienceScore = calculateExperienceMatch(jdExperience, resumeExperience)
      const educationScore = checkEducationMatch(jdEducation, resumeEducation)

      // 计算总分数（加权）
      const totalScore = Math.round(
        skillScore * WEIGHTS.skill +
        experienceScore * WEIGHTS.experience +
        educationScore * WEIGHTS.education +
        100 * WEIGHTS.base
      )

      // 优化：只保存匹配度≥50分的记录，减少无效数据
      if (totalScore >= 50) {
        // 保存匹配结果到数据库
        jdResumeMatchStmt.upsert(positionId, resume.id, {
          matchScore: totalScore,
          skillScore,
          experienceScore,
          educationScore,
          matchedSkills: skillMatch.matched,
          missingSkills: skillMatch.missing
        })

      }

      // 展示时只保留及格线（60分）以上的
      if (totalScore >= PASSING_SCORE) {
        recommendations.push({
          positionId,
          resumeId: resume.id,
          resumeName: resume.name,
          candidateName: resume.candidate_name,
          matchScore: totalScore,
          skillScore,
          experienceScore,
          educationScore,
          matchedSkills: skillMatch.matched,
          missingSkills: skillMatch.missing
        })
      }
    } catch (e) {
      console.error(`处理简历 ${resume.id} 时出错:`, e.message)
      continue
    }
  }

  // 4. 按分数排序并返回（已在前面的逻辑中过滤，这里只需排序）
  return recommendations
    .sort((a, b) => b.matchScore - a.matchScore)
}

/**
 * 获取推荐列表（分页）
 * @param {number} positionId - 职位ID
 * @param {number} page - 页码
 * @param {number} limit - 每页数量
 * @returns {Promise<Object>} { list: [], total: number }
 */
async function getRecommendations(positionId, page = 1, limit = 10) {
  const offset = (page - 1) * limit

  // 从数据库读取已计算的推荐结果
  const list = jdResumeMatchStmt.getRecommendationsByPosition(
    positionId,
    PASSING_SCORE,
    limit,
    offset
  )

  const total = jdResumeMatchStmt.getRecommendationCount(positionId, PASSING_SCORE)

  // 解析JSON字段
  const formattedList = list.map(item => ({
    ...item,
    matchedSkills: item.matched_skills ? JSON.parse(item.matched_skills) : [],
    missingSkills: item.missing_skills ? JSON.parse(item.missing_skills) : []
  }))

  return {
    list: formattedList,
    total
  }
}

/**
 * 通过技能索引快速查找匹配的简历
 * @param {number} positionId - 职位ID
 * @returns {Promise<Array>} 可能匹配的简历列表
 */
async function findResumesBySkillIndex(positionId) {
  const position = positionStmt.getById(positionId)
  if (!position || !position.parsed_skills) {
    return []
  }

  const jdSkills = JSON.parse(position.parsed_skills)

  // 使用技能索引查找匹配的简历
  const matchedResumes = skillResumeIndexStmt.findBySkills(jdSkills)

  return matchedResumes
}

module.exports = {
  calculateSkillMatch,
  calculateExperienceMatch,
  checkEducationMatch,
  recommendResumesForJD,
  getRecommendations,
  findResumesBySkillIndex,
  WEIGHTS,
  PASSING_SCORE
}
