const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    const { OPENID } = cloud.getWXContext();
    const { timelineId, description, members } = event;

    if (!timelineId) {
      return { code: 400, message: 'timelineId required' };
    }

    /** 1️⃣ 校验 owner 权限 */
    const ownerRes = await db
      .collection('timescale_members')
      .where({
        timescaleId: timelineId,
        userId: OPENID,
        role: 'owner'
      })
      .get();

    if (!ownerRes.data.length) {
      return { code: 403, message: 'No permission' };
    }

    /** 2️⃣ 更新 timescale 信息 */
    const updateData = {
      updatedAt: db.serverDate()
    };

    if (typeof description === 'string') {
      updateData.description = description.trim();
    }

    await db.collection('timescale').doc(timelineId).update({
      data: updateData
    });

    /** 3️⃣ 处理协作成员 */
    if (Array.isArray(members)) {
      // 3.1 删除旧的非 owner 成员
      await db.collection('timescale_members')
        .where({
          timescaleId: timelineId,
          role: _.neq('owner')
        })
        .remove();

      // 3.2 插入新成员
      const validMembers = members.filter(
        m => m.userId && ['editor', 'viewer'].includes(m.role)
      );

      if (validMembers.length) {
        await db.collection('timescale_members').add({
          data: validMembers.map(m => ({
            timescaleId: timelineId,
            userId: m.userId,
            role: m.role,
            joinedAt: db.serverDate()
          }))
        });
      }
    }

    return { code: 0, message: 'ok' };

  } catch (err) {
    console.error('[update-timeline] error:', err);
    return { code: 500, message: 'Internal error' };
  }
};