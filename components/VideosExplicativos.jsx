// src/components/VideosExplicativos.jsx
import React, { useState } from 'react';

const HERO_AZUL = '#0f2f4b';

const VIDEOS = [
  {
    id: 1,
    titulo: 'Presentación Proyecto FINFOCUS – ¿Qué son las obligaciones negociables?',
    descripcion:
      'Introducción al proyecto FINFOCUS y explicación sencilla sobre qué son las obligaciones negociables.',
    videoPrincipal: 'https://youtu.be/nNoGF7cpw6s',
    instructivo:
      'https://drive.google.com/file/d/1785MmBAeiWgJrucslPjc9iHVIvdEluAp/view?usp=drive_link',
  },
  {
    id: 2,
    titulo: 'FINFOCUS – primeros pasos',
    descripcion:
      'Guía para dar tus primeros pasos en FINFOCUS y familiarizarte con la plataforma.',
    videoPrincipal: 'https://youtu.be/dlXV8uOp4Xw',
    instructivo:
      'https://drive.google.com/file/d/1785MmBAeiWgJrucslPjc9iHVIvdEluAp/view?usp=drive_link',
  },
  {
    id: 3,
    titulo: 'FINFOCUS – cómo comprar',
    descripcion:
      'Tutorial paso a paso para realizar tu primera operación de compra desde FINFOCUS.',
    videoPrincipal: 'https://youtu.be/dlXV8uOp4Xw',
    instructivo:
      'https://drive.google.com/file/d/1iWJhhPkS1I8QCHaOFhq9TYQdDcaNPXD9/view?usp=drive_link',
    videosAlternativos: [
      {
        label: 'Video alternativo 1 (Balanz)',
        url: 'https://cms.balanz.com/PFS/092393_comprarbonos.mp4',
      },
      {
        label: 'Video alternativo 2 (YouTube)',
        url: 'https://youtu.be/XpjNQRWzM-g',
      },
    ],
  },
  {
    id: 4,
    titulo: 'FINFOCUS – mi primera compra',
    descripcion:
      'Ejemplo práctico de cómo se ve y se registra tu primera compra utilizando FINFOCUS.',
    videoPrincipal: 'https://youtu.be/VHtEljyy8Hc',
  },
  {
    id: 5,
    titulo: 'FINFOCUS – aplicativo CNV y Excel de la cartera',
    descripcion:
      'Cómo usar el aplicativo de la CNV y el Excel de cartera para seguir tus inversiones.',
    videoPrincipal: 'https://youtu.be/FfsU5_PKmkE',
  },
  {
    id: 6,
    titulo:
      'FINFOCUS – ¿Cómo convertir dólares CCL a dólar MEP en Balanz?',
    descripcion:
      'Paso a paso para convertir dólares CCL a MEP desde tu cuenta de Balanz.',
    videoPrincipal: 'https://youtu.be/afWc36guLRs',
  },
  {
    id: 7,
    titulo: 'FINFOCUS – Mis primeros pasos en renta variable',
    descripcion:
      'Introducción a las inversiones en acciones y CEDEARS para quienes empiezan en renta variable.',
    videoPrincipal: 'https://youtu.be/C86o5QnjDYs',
    recursosExtra: [
      {
        tipo: 'instructivo',
        label: 'Instructivo acciones (PDF)',
        url: 'https://drive.google.com/file/d/1Au1_QlPu8ja_dftg61QKGwernPyKg8hj/view?usp=drive_link',
      },
      {
        tipo: 'video',
        label: 'Video acciones (Balanz)',
        url: 'https://cms.balanz.com/PFS/092400_comoinvertirenacciones..mp4',
      },
      {
        tipo: 'instructivo',
        label: 'Instructivo CEDEARS (PDF)',
        url: 'https://drive.google.com/file/d/1pCcOC2tdXC87ErW0M73aiwVo6OstsNIH/view?usp=drive_link',
      },
      {
        tipo: 'video',
        label: 'Video CEDEARS (Balanz)',
        url: 'https://cms.balanz.com/PFS/092398_comoinvertirencedears2.mp4',
      },
    ],
  },
];

// ==== Helper para YouTube ====
function extractYouTubeId(url) {
  if (!url) return null;
  try {
    const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
    if (shortMatch && shortMatch[1]) return shortMatch[1];

    const longMatch = url.match(/[?&]v=([^&]+)/);
    if (longMatch && longMatch[1]) return longMatch[1];

    const embedMatch = url.match(/embed\/([^?&]+)/);
    if (embedMatch && embedMatch[1]) return embedMatch[1];

    return null;
  } catch {
    return null;
  }
}

export default function VideosExplicativos({ toolName }) {
  const [openVideoId, setOpenVideoId] = useState(null);

  const title =
    typeof toolName === 'string' && toolName.trim().length > 0
      ? toolName
      : 'Videos explicativos FINFOCUS';

  const handleMainVideoClick = (item) => {
    const ytId = extractYouTubeId(item.videoPrincipal);
    const isYouTube = !!ytId;

    if (isYouTube) {
      setOpenVideoId((prev) => (prev === item.id ? null : item.id));
    } else if (item.videoPrincipal) {
      // .mp4 u otros: abrir en otra pestaña
      window.open(item.videoPrincipal, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}

      {/* Listado de videos */}
      <div className="space-y-4">
        {VIDEOS.map((item) => {
          const ytId = extractYouTubeId(item.videoPrincipal);
          const isYouTube = !!ytId;
          const thumbnailUrl = isYouTube
            ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
            : null;
          const isOpen = openVideoId === item.id;

          return (
            <div
              key={item.id}
              className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm"
            >
              <div className="mb-3">
                <h2 className="text-base md:text-lg font-semibold text-slate-900">
                  {item.id}. {item.titulo}
                </h2>
                {item.descripcion && (
                  <p className="mt-1 text-xs md:text-sm text-slate-600">
                    {item.descripcion}
                  </p>
                )}
              </div>

              {/* Miniatura + acciones */}
              <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                {/* Miniatura */}
                <div className="w-full md:w-56">
                  {thumbnailUrl ? (
                    <button
                      type="button"
                      onClick={() => handleMainVideoClick(item)}
                      className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0f2f4b]"
                    >
                      <img
                        src={thumbnailUrl}
                        alt={item.titulo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/30" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-md">
                          <span
                            className="ml-1 text-lg"
                            style={{ color: HERO_AZUL }}
                          >
                            ▶
                          </span>
                        </div>
                      </div>
                    </button>
                  ) : (
                    <div className="flex h-32 w-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-500">
                      Vista previa no disponible
                    </div>
                  )}
                </div>

                {/* Botones / enlaces */}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                    {item.videoPrincipal && (
                      <button
                        type="button"
                        onClick={() => handleMainVideoClick(item)}
                        className="inline-flex items-center rounded-full bg-[#0f2f4b] px-3 py-1.5 text-xs md:text-sm font-medium text-white hover:bg-[#0c2338] transition-colors"
                      >
                        {isYouTube
                          ? isOpen
                            ? 'Ocultar video'
                            : 'Ver aquí'
                          : 'Ver video'}
                      </button>
                    )}

                    {isYouTube && (
                      <a
                        href={item.videoPrincipal}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Abrir en YouTube
                      </a>
                    )}

                    {item.instructivo && (
                      <a
                        href={item.instructivo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Ver instructivo (PDF)
                      </a>
                    )}

                    {item.videosAlternativos &&
                      item.videosAlternativos.map((alt, idx) => (
                        <a
                          key={idx}
                          href={alt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 text-xs md:text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          {alt.label}
                        </a>
                      ))}
                  </div>

                  {/* Recursos extra (acciones / CEDEARS) */}
                  {item.recursosExtra && (
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                        Recursos complementarios
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs md:text-sm">
                        {item.recursosExtra.map((recurso, idx) => (
                          <a
                            key={idx}
                            href={recurso.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center rounded-full border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                          >
                            {recurso.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Player embebido (solo YouTube) */}
              {isYouTube && isOpen && (
                <div className="mt-3">
                  <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-black aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}`}
                      title={item.titulo}
                      className="absolute inset-0 h-full w-full"
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
