export const getToolBasics = (): string => {
  const lines: string[] = []
  lines.push('工具能力与使用要点：')
  lines.push('1) toggle_layer_visibility(layer_name, action): 按图层名称显示/隐藏/切换图层；用于“打开/关闭@图层”。')
  lines.push('2) query_features_by_attribute(layer_name, field, operator, value): 属性筛选；操作符需用前端格式 eq/ne/gt/gte/lt/lte/like。')
  lines.push('3) execute_buffer_analysis(layer_name, radius, unit): 缓冲区分析（服务半径/生态缓冲等）。')
  lines.push('4) execute_intersection_analysis(target_layer_name, mask_layer_name): 相交分析（约束叠加、冲突识别）。')
  lines.push('5) execute_erase_analysis(target_layer_name, erase_layer_name): 擦除分析（目标减去约束）。')
  lines.push('6) execute_shortest_path_analysis(start_layer_name, end_layer_name, obstacle_layer_name?): 最短路径与障碍规避分析。')
  lines.push('7) save_query_results_as_layer(layer_name): 将属性查询结果保存为新图层（名称可省略）。')
  lines.push('8) export_query_results_as_json(file_name): 导出查询结果为GeoJSON（.json）。')
  lines.push('9) save_buffer_results_as_layer(layer_name) / export_buffer_results_as_json(file_name): 缓冲区结果保存/导出。')
  lines.push('10) save_intersection_results_as_layer(layer_name) / export_intersection_results_as_json(file_name): 相交结果保存/导出。')
  lines.push('11) save_erase_results_as_layer(layer_name) / export_erase_results_as_json(file_name): 擦除结果保存/导出。')
  lines.push('12) save_path_results_as_layer(layer_name) / export_path_results_as_json(file_name): 最短路径结果保存/导出。')
  return lines.join('\n')
}

export const getEnvironmentalBackground = (): string => {
  const parts: string[] = []
  parts.push('行业背景：新型城镇化推动下，城市空间快速扩张与生态系统服务保障之间的矛盾日益突出。国土空间规划强调以“多规合一”为基础，统筹生产、生活、生态空间，落实耕地保护红线与生态保护红线的刚性约束，通过精细化的空间分析与动态监测提升治理能力。')
  parts.push('生态环境保护：生态保护红线区域具有重要的水源涵养、生物多样性维护、防风固沙与水土保持功能，应保持原真性与完整性。建设项目需避让敏感区，通过缓冲区分析与相交分析识别潜在冲突，采用生态廊道连通、生态修复与近自然治理措施，确保生态系统结构与功能稳定。')
  parts.push('耕地保护：永久基本农田实行“数量不减、质量不降、布局稳定”，以高标准农田建设与占补平衡为抓手，严格控制非农化与非粮化。通过耕地质量评价、耕地与项目选址的空间相交与擦除分析，明确冲突地块与可行替代区，确保底线约束落地执行。')
  parts.push('城市民生设施：学校、医院、养老与应急服务设施选址需兼顾可达性、公平性与安全性。利用最短路径分析与障碍规避，评估步行/车辆到达时间；结合缓冲区分析核算服务半径覆盖范围；在道路与排水、地质灾害敏感区等约束条件下进行多目标权衡。')
  parts.push('技术路线（空间分析）：1) 图层准备与坐标统一(EPSG:4326)；2) 目标要素缓冲区分析（服务半径/生态缓冲）；3) 约束图层相交/擦除分析（生态红线、永久基本农田、洪涝风险区等）；4) 交通可达性与最短路径分析（含障碍层规避）；5) 结果分级与区位适宜性综合评价；6) 结果导出与入库管理。')
  parts.push(getToolBasics())
  return parts.join('\n\n')
}

export const getUseCases = (): string => {
  const items: string[] = []
  items.push('用例A-学校选址：以居住用地为需求源，设置1.5km服务半径缓冲，避让生态红线与永久基本农田，通过相交/擦除得到候选地块；利用道路网络最短路径分析评估可达性，选择覆盖率高与到达时间短的地块。')
  items.push('用例B-生态修复：叠加水土流失敏感区与坡度分区，结合河湖缓冲区，识别重点修复带；通过相交分析定位生态廊道断裂点，制定连通性提升方案。')
  items.push('用例C-城市应急：基于医院/避难所服务半径与路网时空可达性评估盲区，通过新增站点或优化道路节点提升覆盖率。')
  return items.join('\n')
}


