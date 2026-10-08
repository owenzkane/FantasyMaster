interface Props {
  week: number
  currentWeek: number
  lastWeek: number
  disabled: boolean
  onChange: (week: number) => void
}

function WeekPicker({ week, currentWeek, lastWeek, disabled, onChange }: Props) {
  // [1, 2, ..., lastWeek]
  const weeks = Array.from({ length: lastWeek }, (_, i) => i + 1)

  return (
    <label className="week-picker">
      Week
      <select
        value={week}
        disabled={disabled}
        // A select's value is always a string, so convert it back to a number
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {weeks.map((option) => (
          <option key={option} value={option}>
            {option === currentWeek ? `${option} (current)` : option}
          </option>
        ))}
      </select>
    </label>
  )
}

export default WeekPicker
