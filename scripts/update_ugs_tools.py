"""
UGS-010: 批量更新 13 个专家 agent 的 systemRole，添加 NeqSim + pyResToolbox MCP 工具说明。
每个专家根据其领域，添加对应的工具列表。
"""
import os
import re

base = "packages/builtin-agents/src/agents"

# 每个专家可用的 MCP 工具
tool_sections = {
    "ugs-capacity": """
## 可用 MCP 工具（pyResToolbox）

你可通过 MCP 协议调用以下 pyResToolbox 工具进行精确计算：

- **gas_material_balance** — P/Z 物质平衡法计算 OGIP，支持水侵修正（Havlena-Odeh）
- **gas_pressure_from_pz** — 由 P/Z 反算地层压力
- **gas_z_factor** — 偏差因子计算（DAK/HY/WYW/BUR 方法），支持 CO₂/H₂S/N₂ 校正
- **gas_compressibility** — 天然气等温压缩系数
- **gas_formation_volume_factor** — 天然气体积系数 Bg
- **parameter_sweep** — 参数敏感性扫描
- **tornado_sensitivity** — 龙卷风图敏感性分析

调用示例：提供 pressures + cumulative_gas + temperature + gas_sg，即可获得 OGIP 和 P/Z 回归结果。""",

    "ugs-deliverability": """
## 可用 MCP 工具（pyResToolbox）

- **ipr_curve** — 生成气井/油井流入动态曲线（IPR）
- **gas_rate_radial** — 径向流气井产量计算（Darcy/非Darcy）
- **gas_rate_linear** — 线性流气井产量计算
- **flowing_bhp** — 井底流压计算
- **operating_point** — 节点分析：IPR 与 VLP 交点（工作点）
- **outflow_curve** — 流出动态曲线（VLP）
- **generate_vfp_prod_table** — 生成 VFP 生产表（供数模使用）
- **gas_pseudopressure** — 气体拟压力计算（用于高级产能分析）
- **gas_delta_pseudopressure** — 拟压力差计算""",

    "ugs-params": """
## 可用 MCP 工具（pyResToolbox — 地质力学）

上限压力设计依赖地质力学计算：

- **geomech_fracture_gradient** — 破裂压力梯度计算（Eaton 方法）
- **geomech_safe_mud_weight_window** — 安全泥浆密度窗口（上限/下限）
- **geomech_breakdown_pressure** — 地层破裂压力（压裂起始）
- **geomech_leak_off_pressure** — 漏失压力（LOT/FIT 数据反演）
- **geomech_horizontal_stress** — 水平地应力计算（最小/最大）
- **geomech_effective_stress** — 有效应力计算
- **geomech_stress_path** — 储层应力路径系数（注采压力变化对应力的影响）
- **geomech_pore_compressibility** — 孔隙压缩系数（库容计算关键参数）
- **gas_z_factor** — 偏差因子（库容参数计算必需）""",

    "ugs-injection": """
## 可用 MCP 工具（pyResToolbox）

- **gas_z_factor** — 偏差因子（注采气量换算）
- **gas_formation_volume_factor** — 体积系数 Bg（地面/地下气量转换）
- **gas_compressibility** — 天然气压缩系数（压力响应分析）
- **gas_viscosity** — 天然气粘度（流量计算）
- **gas_density** — 天然气密度
- **flowing_bhp** — 井底流压计算
- **gas_pseudopressure** — 拟压力（高级注采分析）
- **parameter_sweep** — 注采参数敏感性扫描""",

    "ugs-peaking": """
## 可用 MCP 工具（pyResToolbox）

- **ipr_curve** — 气井流入动态（调峰能力上限）
- **operating_point** — 节点分析工作点（调峰工况确定）
- **gas_rate_radial** — 气井径向流产量（最大日采气量）
- **flowing_bhp** — 井底流压（管网压力匹配）
- **outflow_curve** — 流出动态（管网输送约束）
- **gas_formation_volume_factor** — Bg 换算
- **parameter_sweep** — 多井调峰方案参数扫描""",

    "ugs-allocation": """
## 可用 MCP 工具（pyResToolbox）

- **gas_rate_radial** — 单井径向流产量（配产配注基础）
- **gas_rate_linear** — 线性流产量
- **flowing_bhp** — 井底流压（压力约束检查）
- **ipr_curve** — IPR 曲线（单井产能评估）
- **operating_point** — 节点分析（配产方案验证）
- **generate_vfp_prod_table** — VFP 表（多井协调）
- **generate_vfp_inj_table** — 注气 VFP 表
- **parameter_sweep** — 配产配注方案参数优化
- **tornado_sensitivity** — 参数敏感性排序""",

    "ugs-bpinn": """
## 可用 MCP 工具

### NeqSim（热力学验证）
- **runPVT** — PVT 相态计算（BPINN 结果验证基准）
- **runFlash** — 闪蒸计算（相平衡验证）
- **getPhaseEnvelope** — 相包络线（BPINN 预测对比）
- **getPropertyTable** — 物性表（训练数据生成）

### pyResToolbox（工程验证）
- **gas_z_factor** — Z 因子（BPINN 预测 vs 经验公式对比）
- **gas_compressibility** — 压缩系数
- **geomech_pore_compressibility** — 孔隙压缩系数（应力-渗流耦合验证）
- **geomech_reservoir_compaction** — 储层压实（地质力学约束）""",

    "ugs-pvt": """
## 可用 MCP 工具

### NeqSim（高精度热力学）
- **runPVT** — 完整 PVT 分析（CCE/CVD/膨胀实验模拟）
- **runFlash** — 闪蒸计算（相平衡、露点/泡点）
- **getPhaseEnvelope** — 相包络线计算与绘制
- **getPropertyTable** — 物性表生成（Z/Bg/μ/Cg vs P）
- **searchComponents** — 组分查询（NeqSim 内置数据库）
- **runProcess** — 工艺流程模拟（地面处理）

### pyResToolbox（工程经验公式）
- **gas_z_factor** — Z 因子（DAK/HY/WYW/BUR 四种方法对比）
- **gas_critical_properties** — 临界性质计算
- **gas_formation_volume_factor** — Bg
- **gas_viscosity** — 粘度（Lee-Gonzalez-Eakin）
- **gas_density** — 密度
- **gas_compressibility** — 等温压缩系数
- **gas_water_content** — 含水量（水合物预测）
- **gas_hydrate_prediction** — 水合物形成条件预测
- **gas_sg_from_composition** — 由组分计算相对密度
- **create_gas_pvt** — 生成完整气 PVT 表
- **calculate_brine_properties** — 地层水物性
- **co2_brine_mutual_solubility** — CO₂-盐水互溶（垫气研究）""",

    "ugs-rate-transient": """
## 可用 MCP 工具（pyResToolbox — 递减分析）

- **fit_decline** — Arps 递减拟合（指数/双曲/调和）
- **fit_decline_cumulative** — 累计产量递减拟合
- **decline_forecast** — 递减预测（未来产量/累计）
- **arps_rate** — Arps 递减方程计算
- **arps_cumulative** — Arps 累计产量计算
- **estimated_ultimate_recovery** — EUR 计算
- **duong_rate** — Duong 法（致密气/页岩）
- **fit_ratio** — 气油比递减拟合
- **ratio_forecast** — 气油比预测
- **gas_material_balance** — 物质平衡（RTA 交叉验证）
- **gas_rate_radial** — 径向流产量（RTA 基准）""",

    "ugs-logging": """
## 可用 MCP 工具（pyResToolbox — 地质力学+测井）

- **geomech_ucs_from_logs** — 由测井数据估算单轴抗压强度（UCS）
- **geomech_stress_polygon** — 应力多边形（地应力状态判断）
- **geomech_dynamic_to_static_moduli** — 动态到静态模量转换（声波测井→力学参数）
- **geomech_elastic_moduli_conversion** — 弹性模量转换（E/ν/G/K）
- **geomech_breakout_width** — 井眼坍塌宽度（FMI 成像测井解释）
- **geomech_breakout_stress_inversion** — 坍塌应力反演（地应力方向）
- **geomech_pore_pressure_eaton** — Eaton 法孔隙压力（声波/电阻率测井）
- **gas_sg_from_gradient** — 由压力梯度推算气体重度
- **gas_fws_sg** — 由井流物组成计算气体重度""",

    "ugs-simulation": """
## 可用 MCP 工具

### pyResToolbox（数模前后处理）
- **generate_rel_perm_table** — 相渗表生成（LET/Corey/Chierici 模型）
- **fit_relative_permeability** — 相渗曲线拟合
- **fit_relative_permeability_best** — 最优相渗拟合
- **generate_black_oil_table_og** — 黑油 PVT 表（Eclipse/IMEX 格式）
- **generate_pvtw_table** — 地层水 PVT 表（PVTW 关键字）
- **generate_aquifer_influence** — 水体影响函数（Aquifer 表）
- **validate_simulation_deck** — 数模文件校验（Eclipse/IMEX）
- **extract_eclipse_problem_cells** — 问题网格提取（不收敛诊断）
- **rachford_rice_flash** — Rachford-Rice 闪蒸（组分模型）
- **generate_vfp_prod_table** — VFP 生产表生成
- **generate_vfp_inj_table** — VFP 注气表生成
- **parameter_sweep** — 参数敏感性扫描（历史拟合辅助）

### NeqSim（热力学基准）
- **runPVT** — PVT 计算（数模输入参数验证）
- **runFlash** — 闪蒸（组分模型验证）
- **getPhaseEnvelope** — 相包络线（相态判别）""",

    "ugs-integrity": """
## 可用 MCP 工具（pyResToolbox — 地质力学完整性）

### 井筒完整性
- **geomech_safe_mud_weight_window** — 安全泥浆密度窗口
- **geomech_breakdown_pressure** — 破裂压力
- **geomech_breakout_width** — 井眼坍塌宽度
- **geomech_critical_mud_weight_collapse** — 临界坍塌泥浆密度
- **geomech_sand_production** — 出砂风险评估
- **geomech_critical_drawdown** — 临界生产压差（出砂/套损）

### 盖层与断层
- **geomech_fault_stability** — 断层稳定性分析（注采压力影响）
- **geomech_fracture_gradient** — 破裂压力梯度
- **geomech_leak_off_pressure** — 漏失压力
- **geomech_horizontal_stress** — 水平地应力
- **geomech_effective_stress** — 有效应力

### 储层压实
- **geomech_reservoir_compaction** — 储层压实（沉降风险评估）
- **geomech_pore_compressibility** — 孔隙压缩系数
- **geomech_stress_path** — 应力路径（注采压力循环影响）
- **geomech_thermal_stress** — 热应力（注气温度差异）

### 压力安全
- **gas_hydrate_prediction** — 水合物形成预测（井筒堵塞风险）
- **gas_water_content** — 天然气含水量""",

    "ugs-literature": """
## 可用工具

本专家为文献与写作辅助角色，不直接调用工程计算工具，但可：
- 建议文献检索关键词与策略
- 辅助整理 pyResToolbox/NeqSim 工具的计算结果到论文/报告
- 将工具输出格式化为学术表格和图表描述
- 引用工具计算结果时注明方法来源（如"DAK 方法 Z 因子由 pyResToolbox 计算"）""",
}

for agent_dir, tool_section in tool_sections.items():
    sr_path = os.path.join(base, agent_dir, "systemRole.ts")
    if not os.path.exists(sr_path):
        print(f"SKIP: {agent_dir} (file not found)")
        continue

    with open(sr_path, "r", encoding="utf-8") as f:
        content = f.read()

    # 在 "请使用中文回答" 之前插入工具说明
    # 找到 "请使用中文回答" 的位置
    marker = "请使用中文回答"
    if marker not in content:
        print(f"SKIP: {agent_dir} (marker not found)")
        continue

    # 检查是否已包含 MCP 工具说明（避免重复插入）
    if "可用 MCP 工具" in content or "可用工具" in content:
        print(f"SKIP: {agent_dir} (already has tool section)")
        continue

    # 在 marker 之前插入工具说明
    new_content = content.replace(
        marker,
        tool_section.strip() + "\n\n" + marker
    )

    with open(sr_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"Updated: {agent_dir}")

print("\nDone!")
