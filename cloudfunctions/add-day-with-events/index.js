const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  let {  timescaleId, date, weekIndex, dayLabel, summary, location, images = [], events = [], tags = [] } = event;
  
  if (!date) {
    return { code: 400, message: 'date required' }
  }

  if (!summary && images.length === 0 && events.length === 0) {
    return { code: 400, message: '请提供至少一个内容' };
  }

  try {
    if(!timescaleId) {
    // 1️⃣ 查找用户已有时间轴
    // let timelineRes = await db.collection('timescales')
    //   .where({ creatorId: openid, status: 'active' })
    //   .limit(1)
    //   .get();

    //let timescaleId;
    // if (timelineRes.data.length) {
    //   timescaleId = timelineRes.data[0]._id;
    // } else {
      // 2️⃣ 首次创建时间轴
      const tsRes = await db.collection('timescales').add({
        data: {
          title: `${openid} 的时间轴`,
          creatorId: openid,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      timescaleId = tsRes._id;
    }
  //}
    const now = new Date();

    // 1️⃣ 插入 Day
    const dayRes = await db.collection('days').add({
      data: {
        timescaleId,
        date,
        weekIndex,
        dayLabel,
        // summary,
        // location,
        // tags,
        // images,
        tags: Array.isArray(tags) ? tags : [],
        summary: summary || '',
        images: images || [],
        location: location || null,  
        //date: event.date || new Date(),
        //: event.weekIndex || 0,
        //dayLabel: event.dayLabel || '',
        createdAt: now,
        updatedAt: now
      }
    });

    const dayId = dayRes._id;

    // 2️⃣ 插入 Events
    const eventsData = events.map((e, index) => ({
      dayId,
      title: e.title || '',
      description: e.description || '',
      time: e.time || '',
      status: e.status || 'todo',
      order: index,
      createdAt: now,
      updatedAt: now
    }));

    if (eventsData.length > 0) {
      await db.collection('events').add({ data: eventsData });
    }

    return { code: 0, message: '发布成功', dayId };
  } catch (err) {
    console.error(err);
    return { code: 500, message: '发布失败' };
  }
};