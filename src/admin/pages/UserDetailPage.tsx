import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Mail, ShieldCheck, User as UserIcon } from 'lucide-react'

import { adminApi } from '../../lib/api/admin'
import type {
  AdminActivityLog,
  AdminOrganizationSummary,
  AdminUserDetail,
  AdminUserStatsResponse,
} from '../../types/admin'

const metricLabels: Record<string, string> = {
  signals_reviewed: 'Signals reviewed',
  contacts_created: 'Contacts created',
  emails_generated: 'Emails generated',
  sequences_created: 'Sequences created',
  total_api_calls: 'Total API calls',
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return value
  }
}

const ActivityRow = ({ log }: { log: AdminActivityLog }) => (
  <tr className="border-b border-slate-100 last:border-0">
    <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(log.timestamp)}</td>
    <td className="px-4 py-3 text-sm font-mono text-slate-700">{log.method}</td>
    <td className="px-4 py-3 text-sm text-slate-700 break-all">{log.endpoint}</td>
    <td className="px-4 py-3 text-sm text-slate-500">{log.status_code ?? '—'}</td>
    <td className="px-4 py-3 text-sm text-slate-500">{log.response_time_ms ? `${log.response_time_ms.toFixed(1)} ms` : '—'}</td>
  </tr>
)

const UsageSparkline = ({ points }: { points: AdminUserStatsResponse['usage_by_day'] }) => {
  const max = useMemo(() => Math.max(0, ...points.map(p => p.api_calls)), [points])

  if (!points.length || max === 0) {
    return <p className="text-sm text-slate-500">Нет данных активности за последние 30 дней.</p>
  }

  return (
    <div className="space-y-2">
      {points.map(point => {
        const width = `${(point.api_calls / max) * 100}%`
        return (
          <div key={point.date} className="grid grid-cols-[120px_1fr_auto] items-center gap-3">
            <span className="text-xs font-medium text-slate-500">{point.date}</span>
            <div className="h-2 rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-orange-500" style={{ width }} />
            </div>
            <span className="text-xs font-semibold text-slate-600">{point.api_calls}</span>
          </div>
        )
      })}
    </div>
  )
}

export const UserDetailPage = () => {
  const { userId } = useParams<{ userId: string }>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<AdminUserDetail | null>(null)
  const [stats, setStats] = useState<AdminUserStatsResponse | null>(null)
  const [activity, setActivity] = useState<AdminActivityLog[]>([])
  const [organizations, setOrganizations] = useState<AdminOrganizationSummary[]>([])

  useEffect(() => {
    if (!userId) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const load = async () => {
      const [detailRes, statsRes, activityRes, orgsRes] = await Promise.all([
        adminApi.users.detail(userId),
        adminApi.users.stats(userId),
        adminApi.users.activity(userId, 50),
        adminApi.users.organizations(userId),
      ])

      if (cancelled) return

      if (!detailRes.data) {
        setError(detailRes.error ?? 'Не удалось загрузить профиль пользователя')
        setLoading(false)
        return
      }

      setProfile(detailRes.data)
      setStats(statsRes.data ?? null)
      setActivity(activityRes.data ?? [])
      setOrganizations(orgsRes.data ?? [])
      setLoading(false)
    }

    load().catch(err => {
      if (!cancelled) {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные пользователя')
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  if (!userId) {
    return <p className="text-sm text-red-500">Не указан идентификатор пользователя.</p>
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Загружаем профиль пользователя…</p>
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-700 space-y-4">
        <div>
          <p className="font-semibold">Не удалось получить данные пользователя</p>
          <p className="text-sm mt-1">{error ?? 'Неизвестная ошибка'}</p>
        </div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Вернуться к списку
        </Link>
      </div>
    )
  }

  const statsMap = stats?.stats ?? null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
            <ArrowLeft className="h-4 w-4" />
            Назад к пользователям
          </Link>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
              <UserIcon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{profile.email ?? 'Без email'}</h1>
              <p className="text-sm text-slate-500">ID: {profile.id}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Роль</p>
          <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-slate-700">
            {profile.is_admin ? (
              <><ShieldCheck className="h-4 w-4 text-emerald-500" /> Администратор</>
            ) : (
              'Пользователь'
            )}
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Создан</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(profile.created_at)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Последний вход</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(profile.last_sign_in_at)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Последняя активность</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{formatDateTime(statsMap?.last_active ?? null)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-slate-500">Организации</p>
          <p className="mt-1 text-sm font-medium text-slate-700">{organizations.length}</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Основные показатели</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {Object.entries(metricLabels).map(([key, label]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {(() => {
                  const value = statsMap?.[key as keyof AdminUserStatsResponse['stats']]
                  return typeof value === 'number' ? value : '—'
                })()}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Активность по дням</h3>
          <p className="mt-1 text-sm text-slate-500">Количество API-вызовов за последние 30 дней.</p>
          <div className="mt-4">
            <UsageSparkline points={stats?.usage_by_day ?? []} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Организации</h3>
          <div className="mt-3 space-y-3">
            {organizations.length === 0 ? (
              <p className="text-sm text-slate-500">Пользователь пока не привязан к организациям.</p>
            ) : (
              organizations.map(org => (
                <div key={org.id} className="rounded-lg border border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800">{org.name ?? 'Без названия'}</p>
                  <p className="text-xs text-slate-500">Участников: {org.user_count}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">Последние действия</h3>
        <p className="mt-1 text-sm text-slate-500">Последние {activity.length} запросов пользователя.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Время</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Метод</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Эндпоинт</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Статус</th>
                <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Время</th>
              </tr>
            </thead>
            <tbody>
              {activity.map(log => (
                <ActivityRow key={log.id ?? `${log.timestamp}-${log.endpoint}`} log={log} />
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
