const { companyStmt } = require('../database')
const { success, error } = require('../utils/response')

const companyController = {
  getAll: (req, res) => {
    try {
      const companies = companyStmt.getAll()
      success(res, companies)
    } catch (err) {
      error(res, err.message)
    }
  },

  search: (req, res) => {
    try {
      const { keyword } = req.query
      if (!keyword) {
        return success(res, [])
      }
      const companies = companyStmt.search(keyword)
      success(res, companies)
    } catch (err) {
      error(res, err.message)
    }
  }
}

module.exports = companyController
