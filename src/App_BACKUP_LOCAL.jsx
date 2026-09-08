import { useEffect, useMemo, useState } from 'react'
import './App.css'
import Entradas from './components/Entradas/Entradas'
import Salidas from './components/Salidas/Salidas'
import Kardex from './components/Kardex/Kardex'
import Productos from './components/Productos/Productos'
import Recetas from './components/Recetas/Recetas'
import Inventario from './components/Inventario/Inventario'
import Dashboard from './components/Dashboard/Dashboard'
import Reportes from './components/Reportes/Reportes'
import { supabase } from './lib/supabaseClient'

const productosIniciales = []


// ==========================================================
// ACCESO Y PERFILES
// WEB: autenticación administrada por Supabase Auth.
// ==========================================================
const ROL_CONFIG = {
  gerencia: {
    nombre: 'Gerencia',
    permisos: ['dashboard','inventario','productos','recetas','entradas','salidas','kardex','reportes','finanzas'],
  },
  administrador: {
    nombre: 'Administrador',
    permisos: ['dashboard','inventario','productos','recetas','entradas','salidas','kardex','reportes','finanzas'],
  },
  vendedor: {
    nombre: 'Vendedor',
    permisos: ['productos','entradas','salidas','kardex'],
  },
}

const USUARIO_A_EMAIL = {
  gerencia: 'gerencia@fitbar.com',
  admin: 'contabilidadsoulfit@gmail.com',
  administrador: 'contabilidadsoulfit@gmail.com',
  vendedor: 'vendedor@fitbar.com',
}

const MENU_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦', grupo: 'OPERACIÓN' },
  { id: 'inventario', label: 'Inventario', icon: '📦', grupo: 'OPERACIÓN' },
  { id: 'productos', label: 'Productos', icon: '🥤', grupo: 'OPERACIÓN' },
  { id: 'recetas', label: 'Recetas', icon: '🧾', grupo: 'OPERACIÓN' },
  { id: 'entradas', label: 'Entradas', icon: '↑', grupo: 'MOVIMIENTOS' },
  { id: 'salidas', label: 'Salidas', icon: '↓', grupo: 'MOVIMIENTOS' },
  { id: 'kardex', label: 'Kardex', icon: '☷', grupo: 'MOVIMIENTOS' },
  { id: 'finanzas', label: 'Finanzas', icon: '💰', grupo: 'MOVIMIENTOS' },
  { id: 'reportes', label: 'Reportes', icon: '▥', grupo: 'MOVIMIENTOS' },
]

function LoginScreen({ onLogin }) {
  const [usuario, setUsuario] = useState('')
  const [clave, setClave] = useState('')
  const [mostrarClave, setMostrarClave] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)

  const iniciarSesion = async (event) => {
    event.preventDefault()
    setError('')

    const entrada = usuario.trim().toLowerCase()
    const email = USUARIO_A_EMAIL[entrada] || entrada

    if (!email || !clave) {
      setError('Ingresa tu usuario/correo y contraseña.')
      return
    }

    setCargando(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password: clave,
      })

      if (authError) {
        setError(authError.message === 'Invalid login credentials'
          ? 'Usuario o contraseña incorrectos.'
          : authError.message)
        return
      }

      if (!data.user) {
        setError('No fue posible iniciar la sesión.')
        return
      }

      const { data: perfil, error: perfilError } = await supabase
        .from('profiles')
        .select('id, nombre, rol, activo')
        .eq('id', data.user.id)
        .single()

      if (perfilError) {
        await supabase.auth.signOut()
        setError('El usuario ingresó, pero no se pudo cargar su perfil.')
        console.error('Error cargando perfil:', perfilError)
        return
      }

      if (!perfil.activo) {
        await supabase.auth.signOut()
        setError('Este usuario está inactivo. Contacta al administrador.')
        return
      }

      const configuracion = ROL_CONFIG[perfil.rol]

      if (!configuracion) {
        await supabase.auth.signOut()
        setError('El perfil no tiene un rol válido configurado.')
        return
      }

      onLogin({
        id: perfil.id,
        nombre: perfil.nombre || data.user.email?.split('@')[0] || 'Usuario',
        rol: perfil.rol,
        permisos: configuracion.permisos,
        email: data.user.email,
      })
    } catch (loginError) {
      console.error('Error inesperado al iniciar sesión:', loginError)
      setError('Ocurrió un error al iniciar sesión. Intenta nuevamente.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-background-shape login-shape-one"></div>
      <div className="login-background-shape login-shape-two"></div>

      <div className="login-shell">
        <section className="login-brand-panel">
          <div className="fitbar-login-logo" aria-label="Fitbar Soul Fit">
            <div className="fitbar-mark">FB</div>
            <div className="fitbar-logo-text">
              <strong>FIT<span>BAR</span></strong>
              <small>SOUL FIT GYM</small>
            </div>
          </div>
          <span className="login-brand-eyebrow">SOUL FIT · FITBAR INVENTARIO</span>
          <h1>Todo el control de tu Fitbar, en un solo lugar.</h1>
          <p>Administra productos, entradas, salidas y existencias con una operación simple y organizada.</p>

          <div className="login-feature-list">
            <div><span>✓</span><div><strong>Operación conectada</strong><small>Entradas y salidas actualizan el inventario.</small></div></div>
            <div><span>✓</span><div><strong>Kardex de control</strong><small>Consulta el movimiento de cada materia prima.</small></div></div>
            <div><span>✓</span><div><strong>Perfiles de acceso</strong><small>Cada usuario ve solo lo que necesita.</small></div></div>
          </div>
        </section>

        <section className="login-form-panel">
          <div className="login-form-header">
            <span className="login-form-label">ACCESO AL SISTEMA</span>
            <h2>Bienvenido</h2>
            <p>Ingresa tus credenciales para continuar.</p>
          </div>

          <form onSubmit={iniciarSesion} className="login-form">
            <label>
              <span>Usuario</span>
              <div className="login-input-wrap">
                <span className="login-input-icon">A</span>
                <input type="text" autoComplete="username" placeholder="Ingresa tu usuario"
                  value={usuario} onChange={(event) => setUsuario(event.target.value)} autoFocus />
              </div>
            </label>

            <label>
              <span>Contraseña</span>
              <div className="login-input-wrap">
                <span className="login-input-icon">•</span>
                <input type={mostrarClave ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Ingresa tu contraseña" value={clave}
                  onChange={(event) => setClave(event.target.value)} />
                <button type="button" className="login-show-password"
                  onClick={() => setMostrarClave((actual) => !actual)}>
                  {mostrarClave ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </label>

            {error && <div className="login-error">⚠ {error}</div>}

            <button className="login-submit" type="submit" disabled={cargando}>
              {cargando ? 'Verificando acceso...' : 'Ingresar al aplicativo'} <span>{cargando ? '…' : '→'}</span>
            </button>
          </form>

          <div className="login-security-note">
            <span>●</span><p>Acceso protegido por perfil de usuario.</p>
          </div>
        </section>
      </div>

      <div className="login-footer">
        <span>FITBAR INVENTARIO</span><span>SOUL FIT GYM</span>
      </div>
    </div>
  )
}

function App() {
  const [usuarioActual, setUsuarioActual] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [activeMenu, setActiveMenu] = useState('dashboard')

  useEffect(() => {
    let activo = true

    const cargarSesion = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          if (activo) setUsuarioActual(null)
          return
        }

        const { data: perfil, error } = await supabase
          .from('profiles')
          .select('id, nombre, rol, activo')
          .eq('id', session.user.id)
          .single()

        if (error || !perfil || !perfil.activo || !ROL_CONFIG[perfil.rol]) {
          await supabase.auth.signOut()
          if (activo) setUsuarioActual(null)
          return
        }

        const configuracion = ROL_CONFIG[perfil.rol]
        if (activo) {
          setUsuarioActual({
            id: perfil.id,
            nombre: perfil.nombre || session.user.email?.split('@')[0] || 'Usuario',
            rol: perfil.rol,
            permisos: configuracion.permisos,
            email: session.user.email,
          })
          setActiveMenu(configuracion.permisos.includes('dashboard') ? 'dashboard' : configuracion.permisos[0])
        }
      } catch (error) {
        console.error('No fue posible recuperar la sesión:', error)
        if (activo) setUsuarioActual(null)
      } finally {
        if (activo) setCargandoSesion(false)
      }
    }

    cargarSesion()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.user) {
        if (activo) {
          setUsuarioActual(null)
          setActiveMenu('dashboard')
        }
        return
      }

      const { data: perfil, error } = await supabase
        .from('profiles')
        .select('id, nombre, rol, activo')
        .eq('id', session.user.id)
        .single()

      if (error || !perfil || !perfil.activo || !ROL_CONFIG[perfil.rol]) return

      const configuracion = ROL_CONFIG[perfil.rol]
      if (activo) {
        setUsuarioActual({
          id: perfil.id,
          nombre: perfil.nombre || session.user.email?.split('@')[0] || 'Usuario',
          rol: perfil.rol,
          permisos: configuracion.permisos,
          email: session.user.email,
        })
        setActiveMenu(configuracion.permisos.includes('dashboard') ? 'dashboard' : configuracion.permisos[0])
      }
    })

    return () => {
      activo = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
    setUsuarioActual(null)
    setActiveMenu('dashboard')
  }

  const iniciarSesion = (usuario) => {
    setUsuarioActual(usuario)
    setActiveMenu(usuario.permisos.includes('dashboard') ? 'dashboard' : usuario.permisos[0])
  }

  const cambiarMenu = (menuId) => {
    if (!usuarioActual?.permisos?.includes(menuId)) return
    setActiveMenu(menuId)
  }

  // ==========================================================
  // DATOS WEB
  // ==========================================================
  // La nueva versión web inicia completamente en cero.
  // Los datos de negocio se incorporarán desde Supabase en los
  // siguientes pasos, sin reutilizar el localStorage de la V1.
  const [productos, setProductos] = useState([])

  const mapearProductoSupabase = (producto) => ({
    id: producto.id,
    codigo: producto.codigo || '',
    nombre: producto.nombre || '',
    categoria: producto.categoria || 'Sin categoría',
    tipo: producto.tipo || 'Materia prima',
    unidad: producto.unidad || 'g',
    stock: Number(producto.stock) || 0,
    stockMinimo: Number(producto.stock_minimo) || 0,
    costo: Number(producto.costo) || 0,
    precioVenta: Number(producto.precio_venta) || 0,
    activo: producto.activo !== false,
  })

  // ==========================================================
  // DATOS WEB: SUPABASE COMO FUENTE ÚNICA
  // ==========================================================
  // La interfaz ya no mantiene inventario, recetas ni movimientos
  // como información local. Al iniciar sesión se recupera todo desde
  // Supabase. Las operaciones de compra/venta se ejecutan mediante
  // funciones transaccionales y luego se vuelve a leer el estado real.
  const [recetas, setRecetas] = useState([])
  const [movimientos, setMovimientos] = useState([])

  const cargarDatosOperativos = async () => {
    const [
      { data: productosData, error: productosError },
      { data: recetasData, error: recetasError },
      { data: entradasData, error: entradasError },
      { data: salidasData, error: salidasError },
      { data: consumosData, error: consumosError },
    ] = await Promise.all([
      supabase
        .from('productos')
        .select('*')
        .order('id', { ascending: true }),

      supabase
        .from('recetas')
        .select('id, producto_id')
        .order('id', { ascending: true }),

      supabase
        .from('entradas')
        .select('id, fecha, producto_id, cantidad, costo_total, costo_unitario, proveedor, observacion, forma_pago, usuario_id')
        .order('id', { ascending: true }),

      supabase
        .from('salidas')
        .select('id, fecha, producto_id, cantidad, precio_venta, valor_total, forma_pago, observacion, usuario_id')
        .order('id', { ascending: true }),

      supabase
        .from('salida_consumos')
        .select('id, salida_id, producto_id, cantidad_consumida, costo_unitario_historico, costo_total_historico')
        .order('id', { ascending: true }),
    ])

    if (productosError) throw new Error(`Productos: ${productosError.message}`)
    if (recetasError) throw new Error(`Recetas: ${recetasError.message}`)
    if (entradasError) throw new Error(`Entradas: ${entradasError.message}`)
    if (salidasError) throw new Error(`Salidas: ${salidasError.message}`)
    if (consumosError) throw new Error(`Consumos: ${consumosError.message}`)

    const productosMapeados = (productosData || []).map(mapearProductoSupabase)
    const productosPorId = new Map(
      productosMapeados.map((producto) => [Number(producto.id), producto])
    )

    const idsRecetas = (recetasData || []).map((receta) => receta.id)
    let ingredientesData = []

    if (idsRecetas.length > 0) {
      const { data, error } = await supabase
        .from('receta_ingredientes')
        .select('id, receta_id, producto_id, cantidad')
        .in('receta_id', idsRecetas)
        .order('id', { ascending: true })

      if (error) throw new Error(`Ingredientes de recetas: ${error.message}`)
      ingredientesData = data || []
    }

    const recetasMapeadas = (recetasData || []).map((receta) => ({
      id: receta.id,
      productoId: Number(receta.producto_id),
      ingredientes: ingredientesData
        .filter((ingrediente) => ingrediente.receta_id === receta.id)
        .map((ingrediente) => ({
          id: ingrediente.id,
          productoId: Number(ingrediente.producto_id),
          cantidad: Number(ingrediente.cantidad),
        })),
    }))

    const movimientosEntrada = (entradasData || []).map((entrada) => {
      const producto = productosPorId.get(Number(entrada.producto_id))

      return {
        id: entrada.id,
        tipo: 'Entrada',
        fecha: entrada.fecha,
        productoId: Number(entrada.producto_id),
        producto: producto?.nombre || 'Materia prima',
        codigo: producto?.codigo || '',
        unidad: producto?.unidad || '',
        cantidad: Number(entrada.cantidad) || 0,
        costoTotal: Number(entrada.costo_total) || 0,
        costoUnitario: Number(entrada.costo_unitario) || 0,
        valorTotal: Number(entrada.costo_total) || 0,
        proveedor: entrada.proveedor || '',
        formaPago: entrada.forma_pago || 'Efectivo',
        naturalezaFinanciera: 'Egreso',
        valorFinanciero: Number(entrada.costo_total) || 0,
        observacion: entrada.observacion || '',
        usuarioId: entrada.usuario_id || null,
      }
    })

    const consumosPorSalida = new Map()

    ;(consumosData || []).forEach((consumo) => {
      const salidaId = Number(consumo.salida_id)

      if (!consumosPorSalida.has(salidaId)) {
        consumosPorSalida.set(salidaId, [])
      }

      const producto = productosPorId.get(Number(consumo.producto_id))

      consumosPorSalida.get(salidaId).push({
        productoId: Number(consumo.producto_id),
        producto: producto?.nombre || 'Ingrediente',
        codigo: producto?.codigo || '',
        unidad: producto?.unidad || '',
        cantidadConsumida: Number(consumo.cantidad_consumida) || 0,
        cantidadPorUnidad: 0,
        stockAnterior: 0,
        costoUnitarioHistorico: Number(consumo.costo_unitario_historico) || 0,
        costoTotalHistorico: Number(consumo.costo_total_historico) || 0,
        id: consumo.id,
      })
    })

    const movimientosSalida = (salidasData || []).map((salida) => {
      const producto = productosPorId.get(Number(salida.producto_id))
      const consumos = consumosPorSalida.get(Number(salida.id)) || []

      const costoTotalHistorico = consumos.reduce(
        (total, consumo) => total + Number(consumo.costoTotalHistorico || 0),
        0
      )

      const cantidad = Number(salida.cantidad) || 0

      return {
        id: salida.id,
        tipo: 'Salida',
        fecha: salida.fecha,
        productoId: Number(salida.producto_id),
        producto: producto?.nombre || 'Producto Fitbar',
        codigo: producto?.codigo || '',
        unidad: producto?.unidad || 'und',
        cantidad,
        precioVenta: Number(salida.precio_venta) || 0,
        valorTotal: Number(salida.valor_total) || 0,
        formaPago: salida.forma_pago || 'Efectivo',
        naturaleza: 'Ingreso por venta',
        naturalezaFinanciera: 'Ingreso',
        valorFinanciero: Number(salida.valor_total) || 0,
        observacion: salida.observacion || '',
        usuarioId: salida.usuario_id || null,
        costoTotalHistorico,
        costoUnitarioHistorico: cantidad > 0 ? costoTotalHistorico / cantidad : 0,
        consumos,
      }
    })

    setProductos(productosMapeados)
    setRecetas(recetasMapeadas)
    setMovimientos([...movimientosEntrada, ...movimientosSalida])
  }

  useEffect(() => {
    if (!usuarioActual?.id) {
      setProductos([])
      setRecetas([])
      setMovimientos([])
      return
    }

    let cancelado = false

    const cargar = async () => {
      try {
        await cargarDatosOperativos()

        if (cancelado) return
      } catch (error) {
        console.error('Error cargando datos operativos desde Supabase:', error)

        if (!cancelado) {
          alert(`No fue posible cargar los datos de Fitbar desde Supabase.\n\n${error.message}`)
        }
      }
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [usuarioActual?.id])

  // ==========================================================
  // FINANZAS: CAJA, BANCOS Y CONCILIACIÓN
  // ==========================================================
  const [conciliaciones, setConciliaciones] = useState([])

  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [modalProducto, setModalProducto] = useState(false)

  const [nuevoProducto, setNuevoProducto] = useState({
    codigo: '',
    nombre: '',
    categoria: '',
    tipo: 'Materia prima',
    unidad: 'g',
    stock: '',
    stockMinimo: '',
    costo: '',
  })

  const [recetaActual, setRecetaActual] = useState({
    productoId: '',
    ingredientes: [],
  })

  const materiasPrimas = useMemo(
    () => productos.filter((producto) => producto.tipo === 'Materia prima'),
    [productos]
  )

  const productosFitbar = useMemo(
    () => productos.filter((producto) => producto.tipo === 'Producto Fitbar'),
    [productos]
  )

  const productosFiltrados = productos.filter((producto) => {
    const texto = busqueda.toLowerCase()

    const coincideBusqueda =
      producto.nombre.toLowerCase().includes(texto) ||
      producto.codigo.toLowerCase().includes(texto)

    const coincideTipo =
      tipoFiltro === 'Todos' || producto.tipo === tipoFiltro

    return coincideBusqueda && coincideTipo
  })

  const recetaSeleccionada = recetas.find(
    (receta) => receta.productoId === Number(recetaActual.productoId)
  )

  const costoReceta = recetaActual.ingredientes.reduce(
    (total, ingrediente) => {
      const producto = materiasPrimas.find(
        (item) => item.id === Number(ingrediente.productoId)
      )

      if (!producto) return total

      const cantidad = Number(ingrediente.cantidad) || 0
      const costo = Number(producto.costo) || 0

      return total + cantidad * costo
    },
    0
  )

  const guardarProducto = (event) => {
    event.preventDefault()

    if (!nuevoProducto.nombre.trim()) {
      alert('Ingresa el nombre del producto.')
      return
    }

    if (!nuevoProducto.codigo.trim()) {
      alert('Ingresa el código del producto.')
      return
    }

    const codigoExiste = productos.some(
      (producto) =>
        producto.codigo.toLowerCase() ===
        nuevoProducto.codigo.trim().toLowerCase()
    )

    if (codigoExiste) {
      alert('Ya existe un producto con ese código.')
      return
    }

    const producto = {
      id: Date.now(),
      codigo: nuevoProducto.codigo.trim(),
      nombre: nuevoProducto.nombre.trim(),
      categoria: nuevoProducto.categoria.trim() || 'Sin categoría',
      tipo: nuevoProducto.tipo,
      unidad: nuevoProducto.unidad,
      stock: Number(nuevoProducto.stock) || 0,
      stockMinimo: Number(nuevoProducto.stockMinimo) || 0,
      costo: Number(nuevoProducto.costo) || 0,
      activo: true,
    }

    setProductos((actuales) => [...actuales, producto])

    setNuevoProducto({
      codigo: '',
      nombre: '',
      categoria: '',
      tipo: 'Materia prima',
      unidad: 'g',
      stock: '',
      stockMinimo: '',
      costo: '',
    })

    setModalProducto(false)
  }

  const crearProducto = async (producto) => {
    const registro = {
      codigo: producto.codigo?.trim(),
      nombre: producto.nombre?.trim(),
      categoria: producto.categoria?.trim() || 'Sin categoría',
      tipo: producto.tipo,
      unidad: producto.unidad,
      stock: 0,
      stock_minimo: Number(producto.stockMinimo) || 0,
      costo: 0,
      precio_venta: Number(producto.precioVenta) || 0,
      activo: true,
    }

    const { data, error } = await supabase
      .from('productos')
      .insert(registro)
      .select('*')
      .single()

    if (error) {
      console.error('Error creando producto:', error)
      alert(`No fue posible crear el producto.\n\n${error.message}`)
      return false
    }

    setProductos((actuales) => [...actuales, mapearProductoSupabase(data)])
    return true
  }

  const editarProducto = async (productoActualizado) => {
    const registro = {
      nombre: productoActualizado.nombre?.trim(),
      categoria: productoActualizado.categoria?.trim() || 'Sin categoría',
      tipo: productoActualizado.tipo,
      unidad: productoActualizado.unidad,
      precio_venta: Number(productoActualizado.precioVenta) || 0,
      stock_minimo: Number(productoActualizado.stockMinimo) || 0,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('productos')
      .update(registro)
      .eq('id', productoActualizado.id)
      .select('*')
      .single()

    if (error) {
      console.error('Error editando producto:', error)
      alert(`No fue posible guardar los cambios.\n\n${error.message}`)
      return false
    }

    setProductos((actuales) =>
      actuales.map((producto) =>
        producto.id === productoActualizado.id
          ? mapearProductoSupabase(data)
          : producto
      )
    )
    return true
  }

  const cambiarEstadoProducto = async (productoId, activo) => {
    const { data, error } = await supabase
      .from('productos')
      .update({
        activo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productoId)
      .select('*')
      .single()

    if (error) {
      console.error('Error cambiando estado del producto:', error)
      alert(`No fue posible cambiar el estado del producto.\n\n${error.message}`)
      return false
    }

    setProductos((actuales) =>
      actuales.map((producto) =>
        producto.id === productoId
          ? mapearProductoSupabase(data)
          : producto
      )
    )
    return true
  }

  // ==========================================================
  // ENTRADAS / SALIDAS: OPERACIONES REALES EN SUPABASE
  // ==========================================================
  // Importante: aquí no modificamos stock manualmente. La base de datos
  // es la que calcula el costo promedio, actualiza existencias, genera
  // Kardex y registra Finanzas. Después de confirmar la transacción,
  // refrescamos la información oficial para que la interfaz quede
  // exactamente sincronizada con Supabase.

  const registrarEntrada = async (entrada) => {
    try {
      const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser()

      if (usuarioError || !usuarioData?.user) {
        throw new Error('No se pudo identificar el usuario de la sesión.')
      }

      const cantidad = Number(entrada.cantidad) || 0
      const costoTotal = Number(
        entrada.costoTotal ?? entrada.valorTotal ?? 0
      ) || 0

      if (cantidad <= 0) {
        throw new Error('La cantidad de entrada debe ser mayor que cero.')
      }

      if (costoTotal < 0) {
        throw new Error('El costo total no puede ser negativo.')
      }

      const { data, error } = await supabase.rpc('registrar_entrada', {
        p_fecha: entrada.fecha,
        p_producto_id: Number(entrada.productoId),
        p_cantidad: cantidad,
        p_costo_total: costoTotal,
        p_proveedor: entrada.proveedor?.trim() || '',
        p_observacion: entrada.observacion?.trim() || '',
        p_forma_pago: entrada.formaPago || 'Efectivo',
        p_usuario_id: usuarioData.user.id,
      })

      if (error) {
        console.error('Error registrando entrada en Supabase:', error)
        throw new Error(error.message || 'No fue posible registrar la entrada.')
      }

      await cargarDatosOperativos()

      console.log('Entrada registrada correctamente:', data)
      return true
    } catch (error) {
      console.error('Error registrando entrada:', error)
      alert(`No fue posible registrar la entrada.\n\n${error.message || 'Error desconocido.'}`)
      return false
    }
  }

  const registrarSalida = async (salida) => {
    try {
      const { data: usuarioData, error: usuarioError } =
        await supabase.auth.getUser()

      if (usuarioError || !usuarioData?.user) {
        throw new Error('No se pudo identificar el usuario de la sesión.')
      }

      const cantidadVendida = Number(salida.cantidad) || 0
      const precioVenta = Number(salida.precioVenta) || 0

      if (cantidadVendida <= 0) {
        throw new Error('La cantidad vendida debe ser mayor que cero.')
      }

      if (precioVenta < 0) {
        throw new Error('El precio de venta no puede ser negativo.')
      }

      const receta = recetas.find(
        (item) => item.productoId === Number(salida.productoId)
      )

      if (!receta) {
        throw new Error(
          'El producto seleccionado no tiene una receta guardada.'
        )
      }

      // La función transaccional de Supabase vuelve a validar stock y
      // congela el costo histórico de cada consumo. La validación visual
      // de faltantes sigue en Salidas.jsx para darle respuesta inmediata
      // al usuario, pero la base de datos es la autoridad final.

      const { data, error } = await supabase.rpc('registrar_salida', {
        p_fecha: salida.fecha,
        p_producto_id: Number(salida.productoId),
        p_cantidad: cantidadVendida,
        p_precio_venta: precioVenta,
        p_forma_pago: salida.formaPago || 'Efectivo',
        p_observacion: salida.observacion?.trim() || '',
        p_usuario_id: usuarioData.user.id,
      })

      if (error) {
        console.error('Error registrando salida en Supabase:', error)
        throw new Error(error.message || 'No fue posible registrar la venta.')
      }

      await cargarDatosOperativos()

      console.log('Salida registrada correctamente:', data)
      return true
    } catch (error) {
      console.error('Error registrando salida:', error)
      alert(`No fue posible registrar la salida.\n\n${error.message || 'Error desconocido.'}`)
      return false
    }
  }

  const seleccionarProductoReceta = (productoId) => {
    const recetaExistente = recetas.find(
      (receta) => receta.productoId === Number(productoId)
    )

    setRecetaActual({
      productoId,
      ingredientes: recetaExistente
        ? recetaExistente.ingredientes.map((ingrediente) => ({ ...ingrediente }))
        : [],
    })
  }

  const agregarIngrediente = () => {
    if (!recetaActual.productoId) {
      alert('Primero selecciona el producto Fitbar.')
      return
    }

    const disponible = materiasPrimas.find(
      (producto) =>
        !recetaActual.ingredientes.some(
          (ingrediente) => ingrediente.productoId === producto.id
        )
    )

    if (!disponible) {
      alert('Todas las materias primas disponibles ya fueron agregadas.')
      return
    }

    setRecetaActual((actual) => ({
      ...actual,
      ingredientes: [
        ...actual.ingredientes,
        {
          productoId: '',
          cantidad: '',
        },
      ],
    }))
  }

  const cambiarIngrediente = (indice, campo, valor) => {
    setRecetaActual((actual) => ({
      ...actual,
      ingredientes: actual.ingredientes.map((ingrediente, i) =>
        i === indice
          ? {
              ...ingrediente,
              [campo]:
                campo === 'productoId' ? Number(valor) : valor,
            }
          : ingrediente
      ),
    }))
  }

  const eliminarIngrediente = (indice) => {
    setRecetaActual((actual) => ({
      ...actual,
      ingredientes: actual.ingredientes.filter(
        (_, i) => i !== indice
      ),
    }))
  }

  const limpiarReceta = () => {
    setRecetaActual({
      productoId: '',
      ingredientes: [],
    })
  }

  const guardarReceta = (event) => {
    event.preventDefault()

    if (!recetaActual.productoId) {
      alert('Selecciona el producto Fitbar.')
      return
    }

    if (recetaActual.ingredientes.length === 0) {
      alert('Agrega al menos un ingrediente.')
      return
    }

    const ingredientesInvalidos = recetaActual.ingredientes.some(
      (ingrediente) =>
        !ingrediente.productoId ||
        Number(ingrediente.cantidad) <= 0
    )

    if (ingredientesInvalidos) {
      alert('Verifica que todos los ingredientes tengan una cantidad mayor que cero.')
      return
    }

    const productosRepetidos =
      new Set(
        recetaActual.ingredientes.map(
          (ingrediente) => Number(ingrediente.productoId)
        )
      ).size !== recetaActual.ingredientes.length

    if (productosRepetidos) {
      alert('No puedes repetir la misma materia prima en una receta.')
      return
    }

    const nuevaReceta = {
      id: recetaSeleccionada?.id || Date.now(),
      productoId: Number(recetaActual.productoId),
      ingredientes: recetaActual.ingredientes.map((ingrediente) => ({
        productoId: Number(ingrediente.productoId),
        cantidad: Number(ingrediente.cantidad),
      })),
    }

    setRecetas((actuales) => {
      const existe = actuales.some(
        (receta) => receta.productoId === nuevaReceta.productoId
      )

      if (existe) {
        return actuales.map((receta) =>
          receta.productoId === nuevaReceta.productoId
            ? nuevaReceta
            : receta
        )
      }

      return [...actuales, nuevaReceta]
    })

    alert('Receta guardada correctamente.')
  }

  const cargarReceta = (receta) => {
    setRecetaActual({
      productoId: String(receta.productoId),
      ingredientes: receta.ingredientes.map((ingrediente) => ({
        ...ingrediente,
      })),
    })
  }

  const eliminarReceta = (productoId) => {
    const producto = productosFitbar.find(
      (item) => item.id === Number(productoId)
    )

    if (
      window.confirm(
        `¿Deseas eliminar la receta de "${producto?.nombre || 'este producto'}"?`
      )
    ) {
      setRecetas((actuales) =>
        actuales.filter(
          (receta) => receta.productoId !== Number(productoId)
        )
      )

      if (Number(recetaActual.productoId) === Number(productoId)) {
        limpiarReceta()
      }
    }
  }

  const guardarRecetaDesdeComponente = async (nuevaReceta) => {
    try {
      const productoId = Number(nuevaReceta.productoId)
      const ingredientes = nuevaReceta.ingredientes.map((ingrediente) => ({
        producto_id: Number(ingrediente.productoId),
        cantidad: Number(ingrediente.cantidad),
      }))

      // La receta se identifica por el producto Fitbar.
      // Primero buscamos si ya existe para decidir entre INSERT y UPDATE.
      const { data: recetaExistente, error: buscarError } = await supabase
        .from('recetas')
        .select('id')
        .eq('producto_id', productoId)
        .maybeSingle()

      if (buscarError) {
        console.error('Error buscando receta:', buscarError)
        alert(`No fue posible consultar la receta.\n\n${buscarError.message}`)
        return false
      }

      let recetaGuardada

      if (recetaExistente) {
        const { data, error } = await supabase
          .from('recetas')
          .update({ producto_id: productoId })
          .eq('id', recetaExistente.id)
          .select('id, producto_id')
          .single()

        if (error) {
          console.error('Error actualizando receta:', error)
          alert(`No fue posible actualizar la receta.\n\n${error.message}`)
          return false
        }

        recetaGuardada = data

        // Reemplazamos completamente los ingredientes de la receta.
        const { error: eliminarIngredientesError } = await supabase
          .from('receta_ingredientes')
          .delete()
          .eq('receta_id', recetaGuardada.id)

        if (eliminarIngredientesError) {
          console.error('Error eliminando ingredientes anteriores:', eliminarIngredientesError)
          alert(`No fue posible actualizar los ingredientes.\n\n${eliminarIngredientesError.message}`)
          return false
        }
      } else {
        const { data, error } = await supabase
          .from('recetas')
          .insert({ producto_id: productoId })
          .select('id, producto_id')
          .single()

        if (error) {
          console.error('Error creando receta:', error)
          alert(`No fue posible guardar la receta.\n\n${error.message}`)
          return false
        }

        recetaGuardada = data
      }

      const { data: ingredientesGuardados, error: ingredientesError } =
        await supabase
          .from('receta_ingredientes')
          .insert(
            ingredientes.map((ingrediente) => ({
              receta_id: recetaGuardada.id,
              producto_id: ingrediente.producto_id,
              cantidad: ingrediente.cantidad,
            }))
          )
          .select('id, receta_id, producto_id, cantidad')

      if (ingredientesError) {
        console.error('Error guardando ingredientes:', ingredientesError)
        alert(`La receta se guardó, pero no fue posible guardar sus ingredientes.\n\n${ingredientesError.message}`)
        return false
      }

      const recetaCompleta = {
        id: recetaGuardada.id,
        productoId: Number(recetaGuardada.producto_id),
        ingredientes: (ingredientesGuardados || []).map((ingrediente) => ({
          id: ingrediente.id,
          productoId: Number(ingrediente.producto_id),
          cantidad: Number(ingrediente.cantidad),
        })),
      }

      setRecetas((actuales) => {
        const existe = actuales.some(
          (receta) => receta.productoId === recetaCompleta.productoId
        )

        return existe
          ? actuales.map((receta) =>
              receta.productoId === recetaCompleta.productoId
                ? recetaCompleta
                : receta
            )
          : [...actuales, recetaCompleta]
      })

      return true
    } catch (error) {
      console.error('Error inesperado guardando receta:', error)
      alert('Ocurrió un error inesperado al guardar la receta.')
      return false
    }
  }

  const eliminarRecetaDesdeComponente = async (productoId) => {
    try {
      const idProducto = Number(productoId)

      const { data: recetaExistente, error: buscarError } = await supabase
        .from('recetas')
        .select('id')
        .eq('producto_id', idProducto)
        .maybeSingle()

      if (buscarError) {
        console.error('Error buscando receta para eliminar:', buscarError)
        alert(`No fue posible consultar la receta.\n\n${buscarError.message}`)
        return false
      }

      if (!recetaExistente) {
        setRecetas((actuales) =>
          actuales.filter((receta) => receta.productoId !== idProducto)
        )
        return true
      }

      const { error } = await supabase
        .from('recetas')
        .delete()
        .eq('id', recetaExistente.id)

      if (error) {
        console.error('Error eliminando receta:', error)
        alert(`No fue posible eliminar la receta.\n\n${error.message}`)
        return false
      }

      setRecetas((actuales) =>
        actuales.filter((receta) => receta.productoId !== idProducto)
      )

      return true
    } catch (error) {
      console.error('Error inesperado eliminando receta:', error)
      alert('Ocurrió un error inesperado al eliminar la receta.')
      return false
    }
  }

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0)

  const movimientosFinancieros = useMemo(
    () =>
      movimientos
        .filter(
          (movimiento) =>
            movimiento.tipo === 'Entrada' || movimiento.tipo === 'Salida'
        )
        .map((movimiento) => {
          const esEntrada = movimiento.tipo === 'Entrada'
          const valor =
            Number(
              movimiento.valorFinanciero ??
                (esEntrada
                  ? movimiento.costoTotal ?? movimiento.valorTotal
                  : movimiento.valorTotal ?? movimiento.total)
            ) || 0

          return {
            ...movimiento,
            fecha: movimiento.fecha || new Date().toISOString().split('T')[0],
            naturaleza: esEntrada ? 'Egreso' : 'Ingreso',
            valor,
            formaPago: movimiento.formaPago || 'Efectivo',
          }
        }),
    [movimientos]
  )

  const resumenFinanciero = useMemo(() => {
    const ingresos = movimientosFinancieros
      .filter((movimiento) => movimiento.naturaleza === 'Ingreso')
      .reduce((total, movimiento) => total + movimiento.valor, 0)

    const egresos = movimientosFinancieros
      .filter((movimiento) => movimiento.naturaleza === 'Egreso')
      .reduce((total, movimiento) => total + movimiento.valor, 0)

    const efectivoIngresos = movimientosFinancieros
      .filter(
        (movimiento) =>
          movimiento.naturaleza === 'Ingreso' &&
          movimiento.formaPago === 'Efectivo'
      )
      .reduce((total, movimiento) => total + movimiento.valor, 0)

    const efectivoEgresos = movimientosFinancieros
      .filter(
        (movimiento) =>
          movimiento.naturaleza === 'Egreso' &&
          movimiento.formaPago === 'Efectivo'
      )
      .reduce((total, movimiento) => total + movimiento.valor, 0)

    const bancoIngresos = movimientosFinancieros
      .filter(
        (movimiento) =>
          movimiento.naturaleza === 'Ingreso' &&
          movimiento.formaPago === 'Transferencia'
      )
      .reduce((total, movimiento) => total + movimiento.valor, 0)

    const bancoEgresos = movimientosFinancieros
      .filter(
        (movimiento) =>
          movimiento.naturaleza === 'Egreso' &&
          movimiento.formaPago === 'Transferencia'
      )
      .reduce((total, movimiento) => total + movimiento.valor, 0)

    return {
      ingresos,
      egresos,
      flujoNeto: ingresos - egresos,
      caja: efectivoIngresos - efectivoEgresos,
      bancos: bancoIngresos - bancoEgresos,
      efectivoIngresos,
      efectivoEgresos,
      bancoIngresos,
      bancoEgresos,
    }
  }, [movimientosFinancieros])

  const registrarConciliacion = (evento) => {
    evento.preventDefault()

    const formulario = new FormData(evento.currentTarget)
    const fecha = formulario.get('fecha')
    const banco = String(formulario.get('banco') || '').trim()
    const concepto = String(formulario.get('concepto') || '').trim()
    const tipo = String(formulario.get('tipo') || 'Ingreso')
    const valor = Number(formulario.get('valor')) || 0

    if (!banco || !concepto || valor <= 0) {
      alert('Completa banco, concepto y un valor mayor que cero.')
      return
    }

    setConciliaciones((actuales) => [
      ...actuales,
      {
        id: Date.now(),
        fecha,
        banco,
        concepto,
        tipo,
        valor,
        conciliado: false,
      },
    ])

    evento.currentTarget.reset()
  }

  const alternarConciliacion = (id) => {
    setConciliaciones((actuales) =>
      actuales.map((item) =>
        item.id === id
          ? { ...item, conciliado: !item.conciliado }
          : item
      )
    )
  }

  const renderFinanzas = () => {
    const maxGrafico = Math.max(
      resumenFinanciero.ingresos,
      resumenFinanciero.egresos,
      1
    )

    return (
      <>
        <div className="page-header">
          <div>
            <span className="eyebrow">CONTROL · FINANCIERO</span>
            <h1>Finanzas</h1>
            <p>
              Controla caja, bancos, flujo de efectivo y conciliación bancaria
              del Fitbar.
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Ingresos por ventas</span>
            <strong>{formatearMoneda(resumenFinanciero.ingresos)}</strong>
            <small>Ventas registradas</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">Egresos por compras</span>
            <strong>{formatearMoneda(resumenFinanciero.egresos)}</strong>
            <small>Entradas de materias primas</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">Flujo neto</span>
            <strong>{formatearMoneda(resumenFinanciero.flujoNeto)}</strong>
            <small>Ingresos menos egresos</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">Saldo caja + bancos</span>
            <strong>
              {formatearMoneda(
                resumenFinanciero.caja + resumenFinanciero.bancos
              )}
            </strong>
            <small>Movimiento financiero registrado</small>
          </div>
        </div>

        <div className="dashboard-two-columns">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Flujo de efectivo</h2>
                <p>Vista ejecutiva de ingresos y egresos registrados.</p>
              </div>
            </div>

            <div style={{ padding: '24px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '24px',
                  alignItems: 'end',
                  minHeight: '230px',
                }}
              >
                <div>
                  <div
                    style={{
                      height: `${Math.max(
                        18,
                        (resumenFinanciero.ingresos / maxGrafico) * 170
                      )}px`,
                      borderRadius: '10px 10px 4px 4px',
                      background: 'var(--primary, #17211d)',
                    }}
                  />
                  <strong style={{ display: 'block', marginTop: '10px' }}>
                    Ingresos
                  </strong>
                  <small>{formatearMoneda(resumenFinanciero.ingresos)}</small>
                </div>

                <div>
                  <div
                    style={{
                      height: `${Math.max(
                        18,
                        (resumenFinanciero.egresos / maxGrafico) * 170
                      )}px`,
                      borderRadius: '10px 10px 4px 4px',
                      background: '#d9e0dc',
                    }}
                  />
                  <strong style={{ display: 'block', marginTop: '10px' }}>
                    Egresos
                  </strong>
                  <small>{formatearMoneda(resumenFinanciero.egresos)}</small>
                </div>
              </div>

              <div className="product-list" style={{ marginTop: '24px' }}>
                <div className="product-row">
                  <div className="product-symbol">EF</div>
                  <div className="product-description">
                    <strong>Caja</strong>
                    <span>Ingresos y egresos en efectivo</span>
                  </div>
                  <div className="stock-number">
                    <strong>{formatearMoneda(resumenFinanciero.caja)}</strong>
                    <span>Saldo</span>
                  </div>
                </div>

                <div className="product-row">
                  <div className="product-symbol">TR</div>
                  <div className="product-description">
                    <strong>Bancos</strong>
                    <span>Ingresos y egresos por transferencia</span>
                  </div>
                  <div className="stock-number">
                    <strong>{formatearMoneda(resumenFinanciero.bancos)}</strong>
                    <span>Saldo</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Conciliación bancaria</h2>
                <p>Registra movimientos del extracto y marca cuáles fueron conciliados.</p>
              </div>
            </div>

            <form onSubmit={registrarConciliacion} style={{ padding: '20px' }}>
              <div className="form-grid">
                <label>
                  Fecha
                  <input
                    name="fecha"
                    type="date"
                    defaultValue={new Date().toISOString().split('T')[0]}
                  />
                </label>

                <label>
                  Banco
                  <input name="banco" type="text" placeholder="Ej. Bancolombia" />
                </label>

                <label>
                  Tipo
                  <select name="tipo" defaultValue="Ingreso">
                    <option value="Ingreso">Ingreso</option>
                    <option value="Egreso">Egreso</option>
                  </select>
                </label>

                <label>
                  Valor
                  <input name="valor" type="number" min="0" step="1" placeholder="0" />
                </label>
              </div>

              <label style={{ display: 'block', marginTop: '14px' }}>
                Concepto
                <input
                  name="concepto"
                  type="text"
                  placeholder="Ej. Transferencia cliente / pago proveedor"
                />
              </label>

              <button
                className="primary-button"
                type="submit"
                style={{ marginTop: '16px' }}
              >
                + Registrar movimiento bancario
              </button>
            </form>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>FECHA</th>
                    <th>BANCO</th>
                    <th>CONCEPTO</th>
                    <th>TIPO</th>
                    <th>VALOR</th>
                    <th>ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {conciliaciones.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '30px' }}>
                        Aún no hay movimientos bancarios para conciliar.
                      </td>
                    </tr>
                  ) : (
                    conciliaciones
                      .slice()
                      .reverse()
                      .map((item) => (
                        <tr key={item.id}>
                          <td>{item.fecha}</td>
                          <td>{item.banco}</td>
                          <td>{item.concepto}</td>
                          <td>{item.tipo}</td>
                          <td>{formatearMoneda(item.valor)}</td>
                          <td>
                            <button
                              type="button"
                              className={
                                item.conciliado
                                  ? 'link-button'
                                  : 'secondary-button'
                              }
                              onClick={() => alternarConciliacion(item.id)}
                            >
                              {item.conciliado ? 'Conciliado' : 'Pendiente'}
                            </button>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Movimientos financieros</h2>
              <p>
                Cada compra y venta queda trazada con su forma de pago para
                facilitar el control de caja y bancos.
              </p>
            </div>
            <span className="status status-ok">
              {movimientosFinancieros.length} movimientos
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>FECHA</th>
                  <th>TIPO</th>
                  <th>REFERENCIA</th>
                  <th>FORMA DE PAGO</th>
                  <th>INGRESO</th>
                  <th>EGRESO</th>
                  <th>SALDO MOVIMIENTO</th>
                </tr>
              </thead>
              <tbody>
                {movimientosFinancieros.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px' }}>
                      No hay movimientos financieros registrados.
                    </td>
                  </tr>
                ) : (
                  movimientosFinancieros
                    .slice()
                    .reverse()
                    .map((movimiento) => {
                      const ingreso = movimiento.naturaleza === 'Ingreso'
                      return (
                        <tr key={`${movimiento.tipo}-${movimiento.id}`}>
                          <td>{movimiento.fecha}</td>
                          <td>{movimiento.naturaleza}</td>
                          <td>
                            {movimiento.producto ||
                              movimiento.concepto ||
                              movimiento.observacion ||
                              'Movimiento Fitbar'}
                          </td>
                          <td>{movimiento.formaPago}</td>
                          <td>{ingreso ? formatearMoneda(movimiento.valor) : '—'}</td>
                          <td>{!ingreso ? formatearMoneda(movimiento.valor) : '—'}</td>
                          <td>
                            {formatearMoneda(
                              ingreso ? movimiento.valor : -movimiento.valor
                            )}
                          </td>
                        </tr>
                      )
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </>
    )
  }

  const renderDashboard = () => {
    const stockBajo = materiasPrimas.filter(
      (producto) => producto.stock <= producto.stockMinimo
    )

    return (
      <>
        <div className="page-header">
          <div>
            <span className="eyebrow">SOUL FIT · FITBAR</span>
            <h1>Control de Inventario</h1>
            <p>
              Administra materias primas, recetas y productos preparados.
            </p>
          </div>

          <button
            className="primary-button"
            type="button"
            onClick={() => cambiarMenu('productos')}
          >
            + Gestionar productos
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Materias primas</span>
            <strong>{materiasPrimas.length}</strong>
            <small>Ingredientes controlados</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">Productos Fitbar</span>
            <strong>{productosFitbar.length}</strong>
            <small>Productos preparados</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">Stock bajo</span>
            <strong>{stockBajo.length}</strong>
            <small>Requieren revisión</small>
          </div>

          <div className="stat-card">
            <span className="stat-label">Recetas configuradas</span>
            <strong>{recetas.length}</strong>
            <small>Fórmulas registradas</small>
          </div>
        </div>

        <div className="dashboard-two-columns">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Materias primas</h2>
                <p>Insumos utilizados en las recetas</p>
              </div>

              <button
                className="link-button"
                type="button"
                onClick={() => {
                  cambiarMenu('productos')
                  setTipoFiltro('Materia prima')
                }}
              >
                Ver todos →
              </button>
            </div>

            <div className="product-list">
              {materiasPrimas.slice(0, 6).map((producto) => (
                <div className="product-row" key={producto.id}>
                  <div className="product-symbol">MP</div>

                  <div className="product-description">
                    <strong>{producto.nombre}</strong>
                    <span>
                      {producto.codigo} · {producto.unidad}
                    </span>
                  </div>

                  <div className="stock-number">
                    <strong>
                      {producto.stock.toLocaleString('es-CO')}
                    </strong>
                    <span>{producto.unidad}</span>
                  </div>

                  <span
                    className={
                      producto.stock <= producto.stockMinimo
                        ? 'status status-warning'
                        : 'status status-ok'
                    }
                  >
                    {producto.stock <= producto.stockMinimo
                      ? 'Stock bajo'
                      : 'Normal'}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Flujo del Fitbar</h2>
                <p>Así funcionará el control</p>
              </div>
            </div>

            <div className="flow">
              <div className="flow-item">
                <span>1</span>
                <div>
                  <strong>Compra</strong>
                  <small>Entrada de materia prima</small>
                </div>
              </div>

              <div className="flow-line"></div>

              <div className="flow-item">
                <span>2</span>
                <div>
                  <strong>Receta</strong>
                  <small>Definición de cantidades</small>
                </div>
              </div>

              <div className="flow-line"></div>

              <div className="flow-item">
                <span>3</span>
                <div>
                  <strong>Venta</strong>
                  <small>Registro del producto vendido</small>
                </div>
              </div>

              <div className="flow-line"></div>

              <div className="flow-item">
                <span>4</span>
                <div>
                  <strong>Salida automática</strong>
                  <small>Descuento de ingredientes</small>
                </div>
              </div>
            </div>
          </section>
        </div>
      </>
    )
  }

  const renderProductos = () => (
    <Productos
      productos={productos}
      onCrearProducto={crearProducto}
      onEditarProducto={editarProducto}
      onCambiarEstado={cambiarEstadoProducto}
    />
  )

  const renderRecetas = () => (
    <Recetas
      productos={productos}
      recetas={recetas}
      onGuardarReceta={guardarRecetaDesdeComponente}
      onEliminarReceta={eliminarRecetaDesdeComponente}
    />
  )

  const renderPlaceholder = (titulo, descripcion) => (
    <div className="module-placeholder">
      <div className="placeholder-icon">⚙</div>
      <h2>{titulo}</h2>
      <p>{descripcion}</p>
      <span>Este módulo lo construiremos en la siguiente etapa.</span>
    </div>
  )

  if (cargandoSesion) {
    return (
      <div className="login-screen">
        <div className="login-loading">
          <div className="fitbar-mark">FB</div>
          <strong>Conectando con Fitbar...</strong>
          <span>Verificando la sesión de usuario.</span>
        </div>
      </div>
    )
  }

  if (!usuarioActual) {
    return <LoginScreen onLogin={iniciarSesion} />
  }

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return (
          <Dashboard
            productos={productos}
            movimientos={movimientos}
            recetas={recetas}
          />
        )

      case 'productos':
        return renderProductos()

      case 'recetas':
        return renderRecetas()

      case 'inventario':
        return (
          <Inventario
            productos={productos}
            movimientos={movimientos}
          />
        )

      case 'entradas':
        return (
          <Entradas
            productos={productos}
            movimientos={movimientos}
            onRegistrarEntrada={registrarEntrada}
          />
        )

      case 'salidas':
        return (
          <Salidas
            productos={productos}
            recetas={recetas}
            movimientos={movimientos}
            onRegistrarSalida={registrarSalida}
          />
        )

      case 'kardex':
        return (
          <Kardex
            productos={productos}
            productosIniciales={productosIniciales}
            movimientos={movimientos}
          />
        )

      case 'finanzas':
        return renderFinanzas()

      case 'reportes':
        return (
          <Reportes
            productos={productos}
            movimientos={movimientos}
            recetas={recetas}
          />
        )

      default:
        return renderDashboard()
    }
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo"><img src="/soul-fit-logo.png" alt="Soul Fit Gym" /></div>

          <div>
            <strong>SOUL FIT</strong>
            <span>FITBAR INVENTARIO</span>
          </div>
        </div>

        {['OPERACIÓN', 'MOVIMIENTOS'].map((grupo) => {
          const items = MENU_ITEMS.filter(
            (item) =>
              item.grupo === grupo &&
              usuarioActual.permisos.includes(item.id)
          )

          if (items.length === 0) return null

          return (
            <div className="menu-section" key={grupo}>
              <span className="menu-title">{grupo}</span>
              <nav>
                {items.map((item) => (
                  <button
                    key={item.id}
                    className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
                    type="button"
                    onClick={() => cambiarMenu(item.id)}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>
          )
        })}

        <div className="sidebar-footer">
          <span className="online"></span>
          Sistema activo
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <span className="topbar-title">
            SOUL FIT / FITBAR / {activeMenu.toUpperCase()}
          </span>

          <div className="user">
            <div className="avatar">
              {(usuarioActual.nombre || 'U').charAt(0).toUpperCase()}
            </div>

            <div className="user-info">
              <strong>{usuarioActual.nombre}</strong>
              <small>{usuarioActual.rol}</small>
            </div>

            <button type="button" className="logout-button" onClick={cerrarSesion}>
              Salir
            </button>
          </div>
        </header>

        <div className="content">{renderContent()}</div>
      </main>

    </div>
  )
}

export default App