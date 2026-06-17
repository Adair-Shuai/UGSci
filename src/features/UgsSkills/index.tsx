// UGS-MODIFY: UGS-017 储气库技能中心主页面
import { Card, Tag } from 'antd';
import { type FC } from 'react';

import { PageHeader } from '@/features/UgsShared';

import {
  type SkillGroup,
  SKILL_DOMAIN_ICONS,
  SKILL_DOMAIN_LABELS,
  UGS_SKILLS,
} from './ugsSkillsData';

const SkillCard: FC<{ group: SkillGroup }> = ({ group }) => {
  return (
    <Card
      size="small"
      style={{ height: '100%', borderColor: '#e8e8e8' }}
      styles={{ body: { padding: 16 } }}
      title={
        <div style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
          <span style={{ fontSize: 20 }}>{SKILL_DOMAIN_ICONS[group.domain]}</span>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{group.title}</span>
          <span style={{ color: '#888', fontSize: 11, marginLeft: 'auto' }}>
            {SKILL_DOMAIN_LABELS[group.domain]}
          </span>
        </div>
      }
    >
      <div style={{ color: '#595959', fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
        {group.description}
      </div>

      <div>
        {group.items.map((skill) => (
          <div
            key={skill.name}
            style={{
              borderBottom: '1px solid #f5f5f5',
              padding: '8px 0',
            }}
          >
            <div style={{ alignItems: 'center', display: 'flex', gap: 6, marginBottom: 4 }}>
              <span style={{ color: '#1f1f1f', fontSize: 13, fontWeight: 500 }}>
                {skill.name}
              </span>
              <Tag style={{ fontSize: 10, margin: 0 }} color="purple">
                {skill.capabilitySource}
              </Tag>
              <Tag style={{ fontSize: 10, margin: 0 }} color="blue">
                {skill.functionName}
              </Tag>
            </div>
            <div style={{ color: '#595959', fontSize: 12, marginBottom: 2 }}>
              {skill.description}
            </div>
            <div style={{ color: '#888', fontSize: 11 }}>输入：{skill.params}</div>
            <div style={{ color: '#888', fontSize: 11 }}>输出：{skill.output}</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const UgsSkillsPage: FC = () => {
  const totalSkills = UGS_SKILLS.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <PageHeader
        description="技能是对能力（Capability）的业务封装——用户说「帮我画相图」，技能路由到 NeqSim 的相图生成能力"
        emoji="✨"
        title="UGSci 技能中心"
      />

      {/* 架构说明 */}
      <Card
        size="small"
        style={{ background: '#f6f8fa', borderColor: '#e8e8e8', marginBottom: 20 }}
        styles={{ body: { padding: 12 } }}
      >
        <div style={{ color: '#595959', fontSize: 12, lineHeight: 1.8 }}>
          <strong>调用链路：</strong>
          <span style={{ marginLeft: 8 }}>
            专家（Expert）→ 技能（Skill）→ 能力（Capability）→ 工具（MCP/API/算法）
          </span>
          <br />
          <strong>用户语义：</strong>
          <span style={{ marginLeft: 8 }}>
            「帮我画相图」→ PVT 技能「相图生成」→ NeqSim 能力 getPhaseEnvelope
          </span>
        </div>
      </Card>

      {/* 统计 */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>技能总数</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{totalSkills}</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>覆盖领域</div>
          <div style={{ color: '#185FA5', fontSize: 20, fontWeight: 600 }}>{UGS_SKILLS.length}</div>
        </Card>
        <Card size="small" style={{ flex: 1 }}>
          <div style={{ color: '#888', fontSize: 11 }}>已连接能力源</div>
          <div style={{ color: '#52c41a', fontSize: 20, fontWeight: 600 }}>2</div>
          <div style={{ color: '#888', fontSize: 11 }}>NeqSim · pyResToolbox</div>
        </Card>
      </div>

      {/* 技能分组 */}
      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        }}
      >
        {UGS_SKILLS.map((group) => (
          <SkillCard group={group} key={group.domain} />
        ))}
      </div>
    </div>
  );
};

export default UgsSkillsPage;
