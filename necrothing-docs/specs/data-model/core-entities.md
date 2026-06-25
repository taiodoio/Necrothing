# Core Data Model

Versione: `v0.1`

## Entità principali

- Grave
- CemeteryCell
- Decoration
- UserProgression
- GraveMemoryEvent
- NotificationPreference
- Achievement
- WorldState

## Grave

| Campo | Tipo | Note |
|---|---|---|
| id | string | UUID |
| name | string | Nome oggetto |
| category | string | enum |
| birthDate | string/null | ISO date |
| deathDate | string | ISO date |
| deathCause | string | enum/custom |
| epitaph | string/null | max 240 |
| photoId | string/null | riferimento storage |
| graveType | string | asset id |
| gridX | integer | posizione |
| gridY | integer | posizione |
| createdAt | string | ISO datetime |
| updatedAt | string | ISO datetime |

## GraveMemoryEvent

| Campo | Tipo | Note |
|---|---|---|
| id | string | UUID |
| graveId | string | FK |
| type | string | burial, flower, weed_cleaned, anniversary, ghost, blessing |
| occurredAt | string | ISO datetime |
| payloadJson | string/null | dati evento |

## WorldState

| Campo | Tipo | Note |
|---|---|---|
| id | string | always singleton |
| lastSimulationAt | string | ISO datetime |
| currentWeather | string | enum |
| currentSeason | string | enum |
| currentDayPhase | string | enum |
| seed | string | RNG seed |
