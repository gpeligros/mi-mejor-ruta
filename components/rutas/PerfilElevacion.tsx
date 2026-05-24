'use client'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

type Punto = { distancia: number; altitud: number }

export default function PerfilElevacion({ puntos }: { puntos: Punto[] }) {
  if (puntos.length === 0) return null

  return (
    <div className="bg-gray-50 rounded-2xl p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Perfil de Elevación</h2>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={puntos} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="altitudGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="distancia"
            tickFormatter={(v: number) => `${v} km`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            tickFormatter={(v: number) => `${v} m`}
            tick={{ fontSize: 12 }}
            width={60}
          />
          <Tooltip
            formatter={(value: unknown) => [`${value} m`, 'Altitud']}
            labelFormatter={(label: unknown) => `${label} km`}
          />
          <Area
            type="monotone"
            dataKey="altitud"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#altitudGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
