// UGS-MODIFY: UGS-016 能力中心类型定义
import type { LobeTool } from '@lobechat/types';

/**
 * 能力分类（6 类）
 */
export type CapabilityCategory =
  | 'data-connection'
  | 'engineering-calc'
  | 'numerical-sim'
  | 'optimization'
  | 'knowledge-retrieval'
  | 'system-collab';

export interface CategoryMeta {
  description: string;
  icon: string;
  key: CapabilityCategory;
  label: string;
}

/**
 * 能力卡片展示数据（从 LobeTool + 额外元数据合成）
 */
export interface CapabilityCardData {
  /** 分类 */
  category: CapabilityCategory;
  /** 连接状态 */
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'untested' | 'planned';
  /** 简述 */
  description: string;
  /** 功能数量 */
  functionCount: number;
  /** 图标（emoji 或 URL） */
  icon: string;
  /** MCP identifier（已安装的有，规划中的无） */
  identifier?: string;
  /** 是否已安装 */
  installed: boolean;
  /** LobeTool 原始数据（已安装的有） */
  lobeTool?: LobeTool;
  /** 能力名称 */
  name: string;
}

/**
 * 规划中（未安装）的能力定义
 */
export interface PlannedCapability {
  category: CapabilityCategory;
  description: string;
  icon: string;
  name: string;
  /** 规划的 identifier（用于后续安装匹配） */
  plannedIdentifier: string;
  /** transport 类型 */
  transportType: 'stdio' | 'http' | 'api' | 'algorithm';
}

export const CATEGORIES: CategoryMeta[] = [
  {
    description: '数据源接入、文件读取、数据库连接',
    icon: '🔌',
    key: 'data-connection',
    label: '数据连接',
  },
  {
    description: 'PVT、储层工程、岩石力学等工程计算',
    icon: '⚙️',
    key: 'engineering-calc',
    label: '工程计算',
  },
  {
    description: 'CMG、Eclipse、OPM 等数值模拟器',
    icon: '🖥️',
    key: 'numerical-sim',
    label: '数值模拟',
  },
  {
    description: 'GA、NSGA-II、PSO 等优化算法',
    icon: '🎯',
    key: 'optimization',
    label: '优化决策',
  },
  {
    description: '知识库、RAG、文献检索',
    icon: '📚',
    key: 'knowledge-retrieval',
    label: '知识与检索',
  },
  {
    description: '系统集成、工作流编排、消息队列',
    icon: '🔗',
    key: 'system-collab',
    label: '系统协同',
  },
];

export const CATEGORY_MAP: Record<CapabilityCategory, CategoryMeta> = CATEGORIES.reduce(
  (acc, cat) => ({ ...acc, [cat.key]: cat }),
  {} as Record<CapabilityCategory, CategoryMeta>,
);

/** 能力中心分类展示顺序 */
export const CATEGORY_ORDER: CapabilityCategory[] = [
  'data-connection',
  'engineering-calc',
  'numerical-sim',
  'optimization',
  'knowledge-retrieval',
  'system-collab',
];
