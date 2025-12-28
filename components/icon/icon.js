Component({
  properties: {
    name: {
      type: String,
      value: 'dot'
    },
    size: {
      type: Number,
      value: 14
    },
    color: {
      type: String,
      value: '#ffffff'
    },
    bold: {
      type: Boolean,
      value: false
    }
  },

  data: {
    displayChar: '•',
    fontSize: '28rpx',
    fontWeight: 'normal'
  },

  observers: {
    'name,size,bold': function (name, size, bold) {
      const iconMap = {
        high: 'H',
        medium: 'M',
        low: 'L',
        dot: '•'
      };

      this.setData({
        displayChar: iconMap[name] || '•',
        fontSize: `${size * 2}rpx`,
        fontWeight: bold ? '700' : 'normal'
      });
    }
  }
});