import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const money = (n) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
const hoy = () => new Date().toLocaleDateString('en-CA')
const categorias = ['Nómina', 'Gas', 'Agua', 'Energía', 'Internet', 'Mantenimiento', 'Arriendo', 'Otros']
const inicial = () => ({ fecha: hoy(), categoria: 'Nómina', concepto: '', valor: '', formaPago: 'Efectivo' })

export default function Gastos({ onChange }) {
  const [items, setItems] = useState([])
  const [f, setF] = useState(inicial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [edicion, setEdicion] = useState(null)
  const [anulacion, setAnulacion] = useState(null)
  const [motivo, setMotivo] = useState('')

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('fitbar_gastos').select('*').order('id', { ascending: false })
    if (err) { setError(err.message); return }
    setItems(data || [])
  }, [])
  useEffect(() => { load() }, [load])

  const reset = () => { setF(inicial()); setEdicion(null); setAnulacion(null); setMotivo('') }
  const iniciarEdicion = (x) => {
    setError(''); setAviso(''); setAnulacion(null); setEdicion(x.id)
    setF({ fecha: x.fecha, categoria: x.categoria, concepto: x.concepto, valor: String(x.valor), formaPago: x.forma_pago })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const save = async (e) => {
    e.preventDefault()
    if (busy) return
    setError(''); setAviso('')
    if (!Number.isFinite(Number(f.valor)) || Number(f.valor) <= 0) { setError('El valor debe ser mayor que cero.'); return }
    setBusy(true)
    try {
      const args = edicion
        ? { p_gasto_id: edicion, p_fecha: f.fecha, p_categoria: f.categoria, p_concepto: f.concepto.trim(), p_valor: Number(f.valor), p_forma_pago: f.formaPago }
        : { p_fecha: f.fecha, p_categoria: f.categoria, p_concepto: f.concepto.trim(), p_valor: Number(f.valor), p_forma_pago: f.formaPago }
      const { error: err } = await supabase.rpc(edicion ? 'fitbar_editar_gasto' : 'fitbar_registrar_gasto', args)
      if (err) throw err
      const msg = edicion ? 'Gasto actualizado y movimiento financiero conciliado.' : 'Gasto registrado correctamente.'
      reset(); await load(); await onChange?.(); setAviso(msg)
    } catch (err) { setError(err.message || 'No fue posible guardar el gasto.') }
    finally { setBusy(false) }
  }
  const anular = async () => {
    if (busy || !anulacion) return
    if (motivo.trim().length < 5) { setError('Escribe un motivo de al menos 5 caracteres.'); return }
    setBusy(true); setError(''); setAviso('')
    try {
      const { error: err } = await supabase.rpc('fitbar_anular_gasto', { p_gasto_id: anulacion.id, p_motivo: motivo.trim() })
      if (err) throw err
      reset(); await load(); await onChange?.(); setAviso('Gasto anulado. Se conservó el historial y se registró la reversión financiera.')
    } catch (err) { setError(err.message || 'No fue posible anular el gasto.') }
    finally { setBusy(false) }
  }
  const activos = items.filter(x => !x.anulada)
  return <>
    <div className="page-header"><div><span className="eyebrow">CONTROL · FINANCIERO</span><h1>Gastos</h1><p>Registro, edición y anulación auditada de gastos operativos.</p></div></div>
    {error && <div role="alert" style={{ background: '#fff1f0', color: '#a21d1d', border: '1px solid #e8b0ac', borderRadius: 10, padding: 14, marginBottom: 14 }}>{error}</div>}
    {aviso && <div role="status" style={{ background: '#edf9ee', color: '#175b2d', border: '1px solid #b6dbbd', borderRadius: 10, padding: 14, marginBottom: 14 }}>{aviso}</div>}
    <section className="panel" style={{ padding: 20 }}>
      <h2>{edicion ? `Editar gasto #${edicion}` : 'Registrar gasto'}</h2>
      <form onSubmit={save}><div className="form-grid">
        <label>Fecha<input type="date" required value={f.fecha} onChange={e => setF({ ...f, fecha: e.target.value })} /></label>
        <label>Categoría<select value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })}>{[...new Set([...categorias, f.categoria])].map(x => <option key={x}>{x}</option>)}</select></label>
        <label>Concepto<input required minLength={3} value={f.concepto} onChange={e => setF({ ...f, concepto: e.target.value })} /></label>
        <label>Valor<input type="number" min="0.01" step="0.01" required value={f.valor} onChange={e => setF({ ...f, valor: e.target.value })} /></label>
        <label>Pago<select value={f.formaPago} onChange={e => setF({ ...f, formaPago: e.target.value })}><option>Efectivo</option><option>Transferencia</option></select></label>
      </div><div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}><button type="submit" className="primary-button" disabled={busy}>{busy ? 'Procesando...' : edicion ? 'Guardar cambios' : 'Registrar gasto'}</button>{edicion && <button type="button" className="secondary-button" onClick={reset} disabled={busy}>Cancelar edición</button>}</div></form>
    </section>
    <section className="panel"><div className="panel-header"><h2>Historial de gastos</h2><strong>{money(activos.reduce((a, x) => a + Number(x.valor), 0))}</strong></div>
      <div className="table-wrapper"><table><thead><tr><th>Fecha</th><th>Categoría</th><th>Concepto</th><th>Pago</th><th>Valor</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
        {items.map(x => <tr key={x.id} style={x.anulada ? { opacity: .6 } : undefined}><td>{x.fecha}</td><td>{x.categoria}</td><td>{x.concepto}</td><td>{x.forma_pago}</td><td>{money(x.valor)}</td><td>{x.anulada ? 'ANULADO' : 'Activo'}</td><td>{!x.anulada && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" className="secondary-button" disabled={busy} onClick={() => iniciarEdicion(x)}>Editar</button><button type="button" className="secondary-button" disabled={busy} onClick={() => { setEdicion(null); setAnulacion(x); setMotivo(''); setError(''); setAviso('') }}>Anular</button></div>}</td></tr>)}
        {!items.length && <tr><td colSpan={7}>No hay gastos registrados.</td></tr>}
      </tbody></table></div>
    </section>
    {anulacion && <section className="panel" style={{ padding: 20, marginTop: 16, border: '1px solid #e1a6a6' }}><h2>Anular gasto #{anulacion.id}</h2><p>{anulacion.concepto} — {money(anulacion.valor)}. La anulación conservará el registro y generará la reversión financiera.</p><label>Motivo de anulación<input required minLength={5} value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Indica por qué se anula" /></label><div style={{ display: 'flex', gap: 10, marginTop: 12 }}><button type="button" className="primary-button" disabled={busy || motivo.trim().length < 5} onClick={anular}>{busy ? 'Procesando...' : 'Confirmar anulación'}</button><button type="button" className="secondary-button" disabled={busy} onClick={() => { setAnulacion(null); setMotivo('') }}>Cancelar</button></div></section>}
  </>
}
