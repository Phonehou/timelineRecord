// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 1. 当前用户
    const { OPENID } = cloud.getWXContext()

    // 2. 找到我参与的 timescale（非 owner）
    const memberRes = await db
      .collection('timescale_members')
      .where({
        userId: OPENID,
        role: _.neq('owner')
      })
      .get()

    if (!memberRes.data.length) {
      return {
        code: 0,
        data: []
      }
    }

    // 3. 提取 timescaleId
    const timescaleIds = memberRes.data.map(item => item.timescaleId)

    // 4. 查询 timescales 详情
    const timescaleRes = await db
      .collection('timescales')
      .where({
        _id: _.in(timescaleIds)
      })
      .orderBy('updatedAt', 'desc')
      .get()

    // 5. 可选：拼接我的角色信息（很有用）
    const roleMap = {}
    memberRes.data.forEach(m => {
      roleMap[m.timescaleId] = m.role
    })

    const result = timescaleRes.data.map(ts => ({
      ...ts,
      myRole: roleMap[ts._id] || 'member'
    }))

    return {
      code: 0,
      data: result
    }

  } catch (err) {
    console.error('[get-followed-timescales] error:', err)
    return {
      code: 500,
      message: 'Internal error'
    }
  }
}