-- UGS-MODIFY: 补齐 ugs-* 专家 agent 记录的 title 字段
-- 遵循 LESSONS_LEARNED.md INC-001 教训：用 UPDATE 补字段，不用 DELETE 重建
-- 执行前请先备份：pg_dump -t agents > backup_agents_$(date +%Y%m%d).sql
--
-- 原因：之前 getBuiltinAgent 创建 agent 记录时不设置 title（BuiltinAgentPersistConfig 没有 title 字段），
-- 导致 agents.title 为 NULL，UI 显示"自定义助理"/"Custom Agent"。
-- 现已在 BuiltinAgentPersistConfig 添加 title 字段，并在 getBuiltinAgent 创建时传入。
-- 本 SQL 补齐已有记录的 title（新建记录会自动带 title，无需此 SQL）。

UPDATE agents SET title = '测井解释专家'       WHERE slug = 'ugs-logging'          AND (title IS NULL OR title = '');
UPDATE agents SET title = '库容评估专家'       WHERE slug = 'ugs-capacity'          AND (title IS NULL OR title = '');
UPDATE agents SET title = '储层物性专家'       WHERE slug = 'ugs-params'            AND (title IS NULL OR title = '');
UPDATE agents SET title = 'PVT 相态专家'       WHERE slug = 'ugs-pvt'               AND (title IS NULL OR title = '');
UPDATE agents SET title = '产能评估专家'       WHERE slug = 'ugs-deliverability'    AND (title IS NULL OR title = '');
UPDATE agents SET title = '注采运行专家'       WHERE slug = 'ugs-injection'         AND (title IS NULL OR title = '');
UPDATE agents SET title = '产量递减/RTA 专家'  WHERE slug = 'ugs-rate-transient'    AND (title IS NULL OR title = '');
UPDATE agents SET title = '井筒完整性专家'     WHERE slug = 'ugs-integrity'         AND (title IS NULL OR title = '');
UPDATE agents SET title = '数值模拟专家'       WHERE slug = 'ugs-simulation'        AND (title IS NULL OR title = '');
UPDATE agents SET title = '调峰能力专家'       WHERE slug = 'ugs-peaking'           AND (title IS NULL OR title = '');
UPDATE agents SET title = '配产配注专家'       WHERE slug = 'ugs-allocation'        AND (title IS NULL OR title = '');
UPDATE agents SET title = 'B-PINN 不确定性专家' WHERE slug = 'ugs-bpinn'            AND (title IS NULL OR title = '');
UPDATE agents SET title = '文献检索专家'       WHERE slug = 'ugs-literature'        AND (title IS NULL OR title = '');

-- 同时补齐 model 和 provider（如果之前也没设置）
UPDATE agents
SET model = 'deepseek-v4-pro', provider = 'deepseek'
WHERE slug LIKE 'ugs-%'
  AND (model IS NULL OR provider IS NULL);

-- 验证结果
SELECT slug, title, model, provider FROM agents WHERE slug LIKE 'ugs-%' ORDER BY slug;
