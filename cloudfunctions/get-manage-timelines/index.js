const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();
  try {
    const memberDocs = await db.collection('timescale_members')
      .where({ userId: OPENID })
      .get();

    const timescaleIds = memberDocs.data.map(m => m.timescaleId);
    if (!timescaleIds.length) {
      return {
        code: 0,
        data: {
          owner: ownerTimelines || [],
          collab: collabTimelines || []
        }
      };
    }

    const timescales = await db.collection('timescales')
      .where({ _id: _.in(timescaleIds) })
      .get();

    const owner = [];
    const collab = [];

    timescales.data.forEach(t => {
      const member = memberDocs.data.find(m => m.timescaleId === t._id);
      const item = { ...t, role: member.role };
      member.role === 'owner' ? owner.push(item) : collab.push(item);
    });

    return { code: 0, data: { owner, collab } };
  } catch (e) {
    return { code: 500, message: e.message };
  }
};