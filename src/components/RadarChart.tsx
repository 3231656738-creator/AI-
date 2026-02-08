import {
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { StandardScoreDetail } from '../types'

interface Props {
  userScore: StandardScoreDetail
  aiScore: StandardScoreDetail
}

const DIMENSION_LABELS: Record<string, string> = {
  argumentQuality: '论点质量',
  logic: '逻辑严密',
  rebuttal: '反驳能力',
  evidence: '论据支撑',
  expression: '表达风度',
}

const MAX_SCORES: Record<string, number> = {
  argumentQuality: 25,
  logic: 25,
  rebuttal: 20,
  evidence: 15,
  expression: 15,
}

export default function RadarChartComponent({ userScore, aiScore }: Props) {
  const data = Object.keys(DIMENSION_LABELS).map((key) => ({
    dimension: DIMENSION_LABELS[key],
    user: ((userScore as any)[key] / (MAX_SCORES as any)[key]) * 100,
    ai: ((aiScore as any)[key] / (MAX_SCORES as any)[key]) * 100,
    userRaw: (userScore as any)[key],
    aiRaw: (aiScore as any)[key],
    max: (MAX_SCORES as any)[key],
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <RechartsRadar data={data} cx="50%" cy="50%" outerRadius="72%">
        <PolarGrid stroke="rgba(148,163,184,0.12)" />
        <PolarAngleAxis
          dataKey="dimension"
          tick={{ fill: '#94a3b8', fontSize: 13 }}
        />
        <PolarRadiusAxis
          angle={90}
          domain={[0, 100]}
          tick={false}
          axisLine={false}
        />
        <Radar
          name="用户"
          dataKey="user"
          stroke="#c9a96e"
          fill="#c9a96e"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Radar
          name="AI"
          dataKey="ai"
          stroke="#60a5fa"
          fill="#60a5fa"
          fillOpacity={0.15}
          strokeWidth={2}
        />
        <Legend
          wrapperStyle={{ fontSize: 13, color: '#94a3b8' }}
        />
      </RechartsRadar>
    </ResponsiveContainer>
  )
}
