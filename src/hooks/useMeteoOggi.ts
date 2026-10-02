import { useEffect, useState } from 'react'
import type { Meteo } from '@/data/types'
import { giornoOggi } from '@/data/seed/giornaliero'

/** Lido dei Pini, Via Nizza — Savona. */
const LAT = 44.296
const LON = 8.452

export interface MeteoOggi {
  meteo: Meteo
  temp?: number // temperatura attuale
  max: number
  min?: number
  vento?: number // km/h
  reale: boolean // true = Open-Meteo, false = dato di esempio della demo
}

/** Codici WMO di Open-Meteo → le 5 categorie usate nell'app. */
function daCodice(c: number): Meteo {
  if (c === 0) return 'sole'
  if (c <= 2) return 'poco_nuvoloso'
  if (c <= 48) return 'nuvoloso'
  if (c >= 95) return 'temporale'
  return 'pioggia'
}

const riserva: MeteoOggi = { meteo: giornoOggi.meteo ?? 'sole', max: giornoOggi.tempMax ?? 26, reale: false }

// Una sola richiesta condivisa tra i componenti (Topbar, Panoramica…), ricaricata ogni 30 minuti.
let cache: { ts: number; p: Promise<MeteoOggi> } | undefined
function caricaMeteo(): Promise<MeteoOggi> {
  if (cache && Date.now() - cache.ts < 30 * 60_000) return cache.p
  const p = fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=Europe%2FRome&forecast_days=1`
  )
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((d): MeteoOggi => ({
      meteo: daCodice(d.current.weather_code),
      temp: Math.round(d.current.temperature_2m),
      max: Math.round(d.daily.temperature_2m_max[0]),
      min: Math.round(d.daily.temperature_2m_min[0]),
      vento: Math.round(d.current.wind_speed_10m),
      reale: true,
    }))
    .catch(() => {
      cache = undefined
      return riserva
    })
  cache = { ts: Date.now(), p }
  return p
}

/** Meteo attuale a Savona da Open-Meteo (gratis, senza chiave); se la rete non risponde usa il dato della demo. */
export function useMeteoOggi(): MeteoOggi {
  const [m, setM] = useState<MeteoOggi>(riserva)
  useEffect(() => {
    let vivo = true
    const aggiorna = () => caricaMeteo().then((r) => vivo && setM(r))
    aggiorna()
    const t = setInterval(aggiorna, 30 * 60_000)
    return () => {
      vivo = false
      clearInterval(t)
    }
  }, [])
  return m
}
