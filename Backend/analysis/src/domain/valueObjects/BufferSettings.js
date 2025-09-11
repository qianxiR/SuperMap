/**
 * 缓冲区设置值对象
 */
class BufferSettings {
  /**
   * 缓冲区设置构造函数
   * 
   * 输入数据格式：
   * @param {number} radius - 缓冲距离
   * @param {string} unit - 距离单位
   * @param {number} steps - 圆弧精度
   * @param {boolean} unionResults - 是否合并结果
   * 
   * 数据处理方法：
   * 1. 验证参数有效性
   * 2. 设置默认值
   * 3. 进行业务规则验证
   * 
   * 输出数据格式：
   * BufferSettings值对象实例
   */
  constructor(radius, unit = 'meters', steps = 10, unionResults = false) {
    this.radius = this._validateRadius(radius);
    this.unit = this._validateUnit(unit);
    this.steps = this._validateSteps(steps);
    this.unionResults = Boolean(unionResults);
  }

  /**
   * 验证缓冲距离
   * 
   * 输入数据格式：
   * @param {number} radius - 缓冲距离
   * 
   * 数据处理方法：
   * 检查距离范围是否在合理区间内
   * 
   * 输出数据格式：
   * 验证后的距离值
   */
  _validateRadius(radius) {
    if (typeof radius !== 'number' || radius <= 0) {
      throw new Error('缓冲距离必须为正数');
    }
    
    if (radius > 100000) {
      throw new Error('缓冲距离不能超过100公里');
    }
    
    if (radius < 0.001) {
      throw new Error('缓冲距离不能小于1毫米');
    }
    
    return radius;
  }

  /**
   * 验证距离单位
   * 
   * 输入数据格式：
   * @param {string} unit - 距离单位
   * 
   * 数据处理方法：
   * 检查单位是否在支持列表中
   * 
   * 输出数据格式：
   * 验证后的单位值
   */
  _validateUnit(unit) {
    const validUnits = ['meters', 'kilometers', 'feet', 'miles'];
    if (!validUnits.includes(unit)) {
      throw new Error(`不支持的距离单位: ${unit}。支持的单位: ${validUnits.join(', ')}`);
    }
    return unit;
  }

  /**
   * 验证圆弧精度
   * 
   * 输入数据格式：
   * @param {number} steps - 圆弧精度
   * 
   * 数据处理方法：
   * 检查精度值是否在合理范围内
   * 
   * 输出数据格式：
   * 验证后的精度值
   */
  _validateSteps(steps) {
    if (typeof steps !== 'number' || steps < 1 || steps > 64) {
      throw new Error('圆弧精度必须在1-64之间');
    }
    return Math.round(steps);
  }

  /**
   * 获取Turf.js缓冲区选项
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 将设置转换为Turf.js所需的选项格式
   * 
   * 输出数据格式：
   * Turf.js缓冲区选项对象
   */
  toTurfOptions() {
    return {
      units: this.unit,
      steps: this.steps
    };
  }

  /**
   * 转换为JSON格式
   * 
   * 输入数据格式：
   * 无
   * 
   * 数据处理方法：
   * 序列化值对象为普通对象
   * 
   * 输出数据格式：
   * JSON对象
   */
  toJSON() {
    return {
      radius: this.radius,
      semicircleLineSegment: this.steps,
      unit: this.unit
    };
  }
}

module.exports = BufferSettings;
