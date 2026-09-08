import { useMemo, useState } from 'react'

function Productos({
  productos = [],
  onCrearProducto,
  onEditarProducto,
  onCambiarEstado,
}) {
  const [busqueda, setBusqueda] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [estadoFiltro, setEstadoFiltro] = useState('Todos')

  const [modalAbierto, setModalAbierto] = useState(false)
  const [productoEditando, setProductoEditando] = useState(null)

  const [formulario, setFormulario] = useState({
    nombre: '',
    tipo: 'Materia prima',
    categoria: '',
    unidad: 'g',
    precioVenta: '',
    stockMinimo: '',
  })

  // ==========================================
  // PRODUCTOS POR TIPO
  // ==========================================

  const materiasPrimas = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.tipo === 'Materia prima'
      ),
    [productos]
  )

  const productosFitbar = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.tipo === 'Producto Fitbar'
      ),
    [productos]
  )

  const productosActivos = useMemo(
    () =>
      productos.filter(
        (producto) =>
          producto.activo !== false
      ),
    [productos]
  )

  // ==========================================
  // FILTROS
  // ==========================================

  const productosFiltrados = useMemo(() => {
    const texto = busqueda
      .trim()
      .toLowerCase()

    return productos.filter((producto) => {
      const coincideBusqueda =
        !texto ||
        producto.nombre
          ?.toLowerCase()
          .includes(texto) ||
        producto.codigo
          ?.toLowerCase()
          .includes(texto)

      const coincideTipo =
        tipoFiltro === 'Todos' ||
        producto.tipo === tipoFiltro

      const activo =
        producto.activo !== false

      const coincideEstado =
        estadoFiltro === 'Todos' ||
        (estadoFiltro === 'Activos' && activo) ||
        (estadoFiltro === 'Inactivos' && !activo)

      return (
        coincideBusqueda &&
        coincideTipo &&
        coincideEstado
      )
    })
  }, [
    productos,
    busqueda,
    tipoFiltro,
    estadoFiltro,
  ])

  // ==========================================
  // GENERAR CÓDIGO AUTOMÁTICO
  // ==========================================

  const generarCodigo = (tipo) => {
    const prefijo =
      tipo === 'Materia prima'
        ? 'MP'
        : 'PF'

    const numerosExistentes = productos
      .filter(
        (producto) =>
          producto.tipo === tipo &&
          producto.codigo?.startsWith(prefijo)
      )
      .map((producto) => {
        const numero = Number(
          producto.codigo
            .replace(prefijo, '')
        )

        return Number.isFinite(numero)
          ? numero
          : 0
      })

    const siguiente =
      numerosExistentes.length > 0
        ? Math.max(...numerosExistentes) + 1
        : 1

    return `${prefijo}${String(
      siguiente
    ).padStart(3, '0')}`
  }

  // ==========================================
  // ABRIR NUEVO
  // ==========================================

  const abrirNuevoProducto = () => {
    setProductoEditando(null)

    setFormulario({
      nombre: '',
      tipo: 'Materia prima',
      categoria: '',
      unidad: 'g',
      precioVenta: '',
      stockMinimo: '',
    })

    setModalAbierto(true)
  }

  // ==========================================
  // ABRIR EDICIÓN
  // ==========================================

  const abrirEditarProducto = (producto) => {
    setProductoEditando(producto)

    setFormulario({
      nombre: producto.nombre || '',
      tipo:
        producto.tipo ||
        'Materia prima',
      categoria:
        producto.categoria || '',
      unidad:
        producto.unidad || 'g',
      precioVenta:
        producto.precioVenta ?? '',
      stockMinimo:
        producto.stockMinimo ?? '',
    })

    setModalAbierto(true)
  }

  // ==========================================
  // CERRAR MODAL
  // ==========================================

  const cerrarModal = () => {
    setModalAbierto(false)
    setProductoEditando(null)
  }

  // ==========================================
  // CAMBIAR TIPO
  // ==========================================

  const cambiarTipo = (tipo) => {
    setFormulario((actual) => ({
      ...actual,
      tipo,
      unidad:
        tipo === 'Producto Fitbar'
          ? 'und'
          : actual.unidad,
      precioVenta:
        tipo === 'Materia prima'
          ? ''
          : actual.precioVenta,
    }))
  }

  // ==========================================
  // GUARDAR PRODUCTO
  // ==========================================

  const manejarSubmit = async (event) => {
    event.preventDefault()

    const nombre =
      formulario.nombre.trim()

    const categoria =
      formulario.categoria.trim()

    if (!nombre) {
      alert(
        'Debes ingresar el nombre del producto.'
      )
      return
    }

    if (!categoria) {
      alert(
        'Debes ingresar la categoría.'
      )
      return
    }

    if (!formulario.unidad) {
      alert(
        'Debes seleccionar una unidad de medida.'
      )
      return
    }

    // ========================================
    // PRODUCTO EDITADO
    // ========================================

    if (productoEditando) {
      const datosActualizados = {
        ...productoEditando,

        nombre,
        tipo: formulario.tipo,
        categoria,
        unidad: formulario.unidad,

        /*
         * El stock actual NO se toca aquí.
         *
         * Para materias primas:
         * Entradas alimenta el stock.
         *
         * Para productos Fitbar:
         * el inventario funciona mediante recetas.
         */
        stock:
          productoEditando.stock ?? 0,

        costo:
          productoEditando.costo ?? 0,

        precioVenta:
          formulario.tipo ===
          'Producto Fitbar'
            ? Number(
                formulario.precioVenta
              ) || 0
            : 0,

        stockMinimo:
          formulario.tipo ===
          'Materia prima'
            ? Number(
                formulario.stockMinimo
              ) || 0
            : 0,
      }

      const guardado = await onEditarProducto?.(
        datosActualizados
      )

      if (guardado !== false) {
        cerrarModal()
      }

      return
    }

    // ========================================
    // NUEVO PRODUCTO
    // ========================================

    const nuevoProducto = {
      id: Date.now(),

      codigo: generarCodigo(
        formulario.tipo
      ),

      nombre,

      tipo: formulario.tipo,

      categoria,

      unidad:
        formulario.unidad,

      /*
       * IMPORTANTE:
       *
       * Una materia prima nueva comienza
       * sin existencias.
       *
       * El stock llegará posteriormente
       * por el módulo ENTRADAS.
       */
      stock: 0,

      /*
       * El costo de la materia prima
       * también será determinado por las
       * compras realizadas en ENTRADAS.
       */
      costo: 0,

      /*
       * Solamente los productos Fitbar
       * tienen precio de venta.
       */
      precioVenta:
        formulario.tipo ===
        'Producto Fitbar'
          ? Number(
              formulario.precioVenta
            ) || 0
          : 0,

      /*
       * El stock mínimo solamente tiene
       * sentido para materias primas.
       */
      stockMinimo:
        formulario.tipo ===
        'Materia prima'
          ? Number(
              formulario.stockMinimo
            ) || 0
          : 0,

      activo: true,
    }

    const creado = await onCrearProducto?.(
      nuevoProducto
    )

    if (creado !== false) {
      cerrarModal()
    }
  }

  // ==========================================
  // ACTIVAR / DESACTIVAR
  // ==========================================

  const cambiarEstado = (producto) => {
    onCambiarEstado?.(
      producto.id,
      producto.activo === false
    )
  }

  // ==========================================
  // FORMATOS
  // ==========================================

  const formatearNumero = (valor) =>
    Number(valor || 0).toLocaleString(
      'es-CO',
      {
        maximumFractionDigits: 2,
      }
    )

  const formatearMoneda = (valor) =>
    Number(valor || 0).toLocaleString(
      'es-CO',
      {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }
    )

  return (
    <>
      {/* =====================================
          ENCABEZADO
      ====================================== */}

      <div className="page-header products-page-header">
        <div>
          <span className="eyebrow">
            CATÁLOGO · FITBAR
          </span>

          <h1>
            Productos
          </h1>

          <p>
            Administra las materias primas y
            productos terminados que pertenecen
            a Fitbar.
          </p>
        </div>

        <button
          type="button"
          className="primary-button products-new-button"
          onClick={
            abrirNuevoProducto
          }
        >
          <span className="products-new-icon">+</span>
          <span>Nuevo producto</span>
        </button>
      </div>

      {/* =====================================
          INDICADORES
      ====================================== */}

      <div className="stats-grid products-summary-grid">

        <div className="stat-card product-kpi">
          <span className="product-kpi-icon">▦</span>
          <div className="product-kpi-content">
            <span className="stat-label">
              Productos registrados
          </span>

          <strong>
            {productos.length}
          </strong>

            <small>
              Catálogo total
            </small>
          </div>
        </div>

        <div className="stat-card product-kpi">
          <span className="product-kpi-icon">MP</span>
          <div className="product-kpi-content">
            <span className="stat-label">
              Materias primas
          </span>

          <strong>
            {materiasPrimas.length}
          </strong>

            <small>
              Ingredientes controlados
            </small>
          </div>
        </div>

        <div className="stat-card product-kpi">
          <span className="product-kpi-icon product-kpi-icon-finished">PF</span>
          <div className="product-kpi-content">
            <span className="stat-label">
              Productos Fitbar
          </span>

          <strong>
            {productosFitbar.length}
          </strong>

            <small>
              Productos terminados
            </small>
          </div>
        </div>

        <div className="stat-card product-kpi">
          <span className="product-kpi-icon product-kpi-icon-active">✓</span>
          <div className="product-kpi-content">
            <span className="stat-label">
              Activos
          </span>

          <strong>
            {productosActivos.length}
          </strong>

            <small>
              Disponibles para operar
            </small>
          </div>
        </div>
      </div>

      {/* =====================================
          CATÁLOGO Y FILTROS
      ====================================== */}

      <section className="panel products-catalog-panel">

        <div className="panel-header products-panel-header">

          <div>
            <div>
              <span className="section-kicker">CATÁLOGO</span>
              <h2>
                Catálogo de productos
              </h2>
            </div>

            <p>
              Busca y clasifica las materias
              primas y productos Fitbar.
            </p>
          </div>

        </div>

        <div className="filters products-filters">

          <div className="products-search">
            <span className="products-search-icon">⌕</span>
            <input
              type="search"
            value={busqueda}
            onChange={(event) =>
              setBusqueda(
                event.target.value
              )
            }
                placeholder="Buscar por nombre o código..."
            />
          </div>

          <select
            value={tipoFiltro}
            onChange={(event) =>
              setTipoFiltro(
                event.target.value
              )
            }
          >
            <option value="Todos">
              Todos
            </option>

            <option value="Materia prima">
              Materias primas
            </option>

            <option value="Producto Fitbar">
              Productos Fitbar
            </option>
          </select>

          <select
            value={estadoFiltro}
            onChange={(event) =>
              setEstadoFiltro(
                event.target.value
              )
            }
          >
            <option value="Todos">
              Todos los estados
            </option>

            <option value="Activos">
              Activos
            </option>

            <option value="Inactivos">
              Inactivos
            </option>
          </select>

        </div>

      </section>

      {/* =====================================
          TABLA
      ====================================== */}

      <section className="panel products-table-panel">

        <div className="products-table-topline">
          <div>
            <span className="section-kicker">REGISTRO</span>
            <h2>Productos registrados</h2>
            <p>Consulta, edita y administra el estado del catálogo.</p>
          </div>
          <span className="count-badge">{productosFiltrados.length} productos</span>
        </div>

        {productosFiltrados.length ===
        0 ? (

          <div className="empty-state">

            <strong>
              No encontramos productos
            </strong>

            <span>
              Cambia los filtros o crea un
              nuevo producto.
            </span>

          </div>

        ) : (

          <div className="table-container products-table-wrapper">

            <table className="products-table">

              <thead>
                <tr>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Unidad</th>
                  <th>Stock</th>
                  <th>Costo</th>
                  <th>Precio venta</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>

              <tbody>

                {productosFiltrados.map(
                  (producto) => {

                    const esMateriaPrima =
                      producto.tipo ===
                      'Materia prima'

                    const activo =
                      producto.activo !== false

                    const stock =
                      Number(
                        producto.stock
                      ) || 0

                    const costo =
                      Number(
                        producto.costo
                      ) || 0

                    return (
                      <tr
                        key={producto.id}
                      >

                        {/* CÓDIGO */}

                        <td>
                          <span className="products-code">{producto.codigo}</span>
                        </td>

                        {/* PRODUCTO */}

                        <td>
                          <div className="products-name-cell">
                            <span className="products-row-icon">{esMateriaPrima ? 'MP' : 'PF'}</span>
                            <strong>{producto.nombre}</strong>
                          </div>
                        </td>

                        {/* TIPO */}

                        <td>

                          <span
                            className={
                              esMateriaPrima
                                ? 'type-badge raw'
                                : 'type-badge finished'
                            }
                          >
                            {producto.tipo}
                          </span>

                        </td>

                        {/* CATEGORÍA */}

                        <td>
                          {producto.categoria}
                        </td>

                        {/* UNIDAD */}

                        <td>
                          {producto.unidad}
                        </td>

                        {/* STOCK */}

                        <td>

                          {esMateriaPrima ? (

                            <>
                              <strong>
                                {formatearNumero(
                                  stock
                                )}
                              </strong>{' '}
                              {producto.unidad}
                            </>

                          ) : (

                            <span>
                              Por receta
                            </span>

                          )}

                        </td>

                        {/* COSTO */}

                        <td>

                          {esMateriaPrima ? (

                            costo > 0 ? (
                              formatearMoneda(
                                costo
                              )
                            ) : (
                              <span>
                                Se determina en Entradas
                              </span>
                            )

                          ) : (

                            costo > 0
                              ? formatearMoneda(
                                  costo
                                )
                              : (
                                <span>
                                  Por receta
                                </span>
                              )

                          )}

                        </td>

                        {/* PRECIO DE VENTA */}

                        <td>

                          {!esMateriaPrima &&
                          Number(
                            producto.precioVenta
                          ) > 0
                            ? formatearMoneda(
                                producto.precioVenta
                              )
                            : '—'}

                        </td>

                        {/* ESTADO */}

                        <td>

                          <span
                            className={
                              activo
                                ? 'status status-ok'
                                : 'status status-warning'
                            }
                          >
                            {activo
                              ? 'Activo'
                              : 'Inactivo'}
                          </span>

                        </td>

                        {/* ACCIONES */}

                        <td>

                          <div
                            style={{
                              display:
                                'flex',
                              gap: '6px',
                              flexWrap:
                                'wrap',
                            }}
                          >

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                abrirEditarProducto(
                                  producto
                                )
                              }
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              className="secondary-button"
                              onClick={() =>
                                cambiarEstado(
                                  producto
                                )
                              }
                            >
                              {activo
                                ? 'Desactivar'
                                : 'Activar'}
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* =====================================
          MODAL NUEVO / EDITAR PRODUCTO
      ====================================== */}

      {modalAbierto && (

        <div className="modal-overlay">

          <div className="modal product-modal">

            <div className="modal-header product-modal-header">

              <div>

                <span className="eyebrow">
                  CATÁLOGO FITBAR
                </span>

                <h2>
                  {productoEditando
                    ? 'Editar producto'
                    : 'Nuevo producto'}
                </h2>
                <p className="product-modal-subtitle">
                  Configura la información básica del producto sin modificar sus movimientos.
                </p>

              </div>

              <button
                type="button"
                className="close-button"
                onClick={
                  cerrarModal
                }
              >
                ×
              </button>

            </div>

            <form
              onSubmit={
                manejarSubmit
              }
            >

              <div className="form-grid">

                {/* NOMBRE */}

                <label>
                  Nombre

                  <input
                    type="text"
                    value={
                      formulario.nombre
                    }
                    onChange={(event) =>
                      setFormulario(
                        (actual) => ({
                          ...actual,
                          nombre:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Ej. Batido de Café"
                  />

                </label>

                {/* TIPO */}

                <label>
                  Tipo

                  <select
                    value={
                      formulario.tipo
                    }
                    onChange={(event) =>
                      cambiarTipo(
                        event.target.value
                      )
                    }
                  >

                    <option value="Materia prima">
                      Materia prima
                    </option>

                    <option value="Producto Fitbar">
                      Producto Fitbar
                    </option>

                  </select>

                </label>

                {/* CATEGORÍA */}

                <label>
                  Categoría

                  <input
                    type="text"
                    value={
                      formulario.categoria
                    }
                    onChange={(event) =>
                      setFormulario(
                        (actual) => ({
                          ...actual,
                          categoria:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder={
                      formulario.tipo ===
                      'Producto Fitbar'
                        ? 'Ej. Batidos'
                        : 'Ej. Frutas'
                    }
                  />

                </label>

                {/* UNIDAD */}

                <label>
                  Unidad de medida

                  <select
                    value={
                      formulario.unidad
                    }
                    onChange={(event) =>
                      setFormulario(
                        (actual) => ({
                          ...actual,
                          unidad:
                            event.target
                              .value,
                        })
                      )
                    }
                  >

                    <option value="g">
                      Gramos (g)
                    </option>

                    <option value="kg">
                      Kilogramos (kg)
                    </option>

                    <option value="ml">
                      Mililitros (ml)
                    </option>

                    <option value="L">
                      Litros (L)
                    </option>

                    <option value="und">
                      Unidades
                    </option>

                  </select>

                </label>

                {/* PRECIO VENTA */}

                {formulario.tipo ===
                  'Producto Fitbar' && (

                  <label>
                    Precio de venta

                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={
                        formulario.precioVenta
                      }
                      onChange={(event) =>
                        setFormulario(
                          (actual) => ({
                            ...actual,
                            precioVenta:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Ej. 12000"
                    />

                  </label>

                )}

                {/* STOCK MÍNIMO */}

                {formulario.tipo ===
                  'Materia prima' && (

                  <label>
                    Stock mínimo

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={
                        formulario.stockMinimo
                      }
                      onChange={(event) =>
                        setFormulario(
                          (actual) => ({
                            ...actual,
                            stockMinimo:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Ej. 500"
                    />

                  </label>

                )}

              </div>

              {/* =================================
                  MENSAJE INFORMATIVO
              ================================== */}

              <div className="product-info-box"
                style={{
                  marginTop:
                    '18px',
                  padding:
                    '14px 16px',
                  borderRadius:
                    '10px',
                  background:
                    '#f7f9f8',
                  fontSize:
                    '12px',
                  lineHeight:
                    '1.6',
                  color:
                    '#69736d',
                }}
              >

                {formulario.tipo ===
                'Materia prima' ? (

                  <>
                    <strong
                      style={{
                        color:
                          '#1d2721',
                      }}
                    >
                      Materia prima:
                    </strong>{' '}

                    aquí solamente definimos
                    el producto, su unidad y
                    stock mínimo.

                    <br />

                    <strong
                      style={{
                        color:
                          '#1d2721',
                      }}
                    >
                      El stock y el costo no se
                      ingresan aquí.
                    </strong>{' '}

                    Se alimentarán automáticamente
                    desde el módulo{' '}
                    <strong>
                      Entradas
                    </strong>.
                  </>

                ) : (

                  <>
                    <strong
                      style={{
                        color:
                          '#1d2721',
                      }}
                    >
                      Producto Fitbar:
                    </strong>{' '}

                    aquí definimos el producto
                    que venderá Fitbar y su
                    precio de venta.

                    <br />

                    Su costo se calculará
                    posteriormente a partir de
                    su{' '}
                    <strong>
                      receta
                    </strong>{' '}
                    y las materias primas
                    utilizadas.
                  </>

                )}

              </div>

              {/* BOTONES */}

              <div
                className="modal-actions"
                style={{
                  marginTop:
                    '20px',
                }}
              >

                <button
                  type="button"
                  className="secondary-button"
                  onClick={
                    cerrarModal
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {productoEditando
                    ? 'Guardar cambios'
                    : 'Crear producto'}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}
    </>
  )
}

export default Productos