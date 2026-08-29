interface Props {
  name: string
  spectrum: number[]
  eliminated: boolean
  id:string
}

/** Compact per-column height view (grid/flexbox only). */
export function SpectrumView({ name, spectrum, eliminated,id }: Props) {
  const bars = spectrum.map((height, index) => (
    <div className="spectrum-column" key={index}>
      <div className="spectrum-fill" style={{ height: `${height * 5}%` }} />
    </div>
  ))
  return (
    <div className="spectrum" aria-label={`${name} spectrum`}>
      <div className="spectrum-bars">{bars}</div>
      <div className="spectrum-name" title={"ID: "+id}>
        {name}
        {eliminated ? ' ❌' : ''}
      </div>
    </div>
  )
}