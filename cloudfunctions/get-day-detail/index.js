const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
  const { dayId } = event;

  if (!dayId) {
    return { code: 400, message: 'dayId required' };
  }

  /* 1️⃣ 查询 day */
  const dayRes = await db
    .collection('days')
    .where({ _id: dayId })
    .get();

  if (!dayRes.data.length) {
    return { code: 404, message: 'Day not found' };
  }

  const day = dayRes.data[0];

  /* 2️⃣ 查询当天事件 */
  const eventsRes = await db
    .collection('events')
    .where({
      dayId: dayId,
      status: db.command.in(['todo', 'doing', 'done'])
    })
    .orderBy('order', 'asc')
    .get();

  /* 3️⃣ 返回整合数据 */
  return {
    code: 0,
    data: {
      _id: day._id,
      date: day.date,
      dayLabel: day.dayLabel,
      summary: day.summary || '',
      location: day.location || '',
      images: (day.images || [])
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
      events: eventsRes.data.map(e => ({
        _id: e._id,
        title: e.title,
        description: e.description,
        time: e.time,
        priority: e.priority,
        status: e.status
      }))
    }
  };
  } catch (err) {
    console.error('[get-day-detail] error:', err);
    return {
      code: 500,
      message: 'Internal error'
    };
  }
};