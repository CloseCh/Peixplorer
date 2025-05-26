document.addEventListener('DOMContentLoaded', function () {
  const video = document.getElementById('bgVideo');

  // Asegurar que el video se reproduzca
  video.addEventListener('loadeddata', function () {
    video.play().catch(function (error) {
      console.log('Error al reproducir video:', error);
    });
  });

  // Reanudar si se pausa inesperadamente
  video.addEventListener('pause', function () {
    if (!video.ended) {
      setTimeout(() => {
        video.play().catch(console.log);
      }, 100);
    }
  });

  // Manejar cuando la pestaña vuelve a estar activa
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && video.paused) {
      video.play().catch(console.log);
    }
  });
});