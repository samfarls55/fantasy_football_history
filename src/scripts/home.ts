document.querySelectorAll<HTMLImageElement>('img[data-initials]').forEach(image => {
  const showFallback = () => {
    const fallback = document.createElement('span');
    fallback.className = `${image.className} image-fallback`;
    fallback.textContent = image.dataset.initials!;
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', image.alt || 'Team image unavailable');
    image.replaceWith(fallback);
  };
  image.addEventListener('error', showFallback, { once: true });
  if (image.complete && image.naturalWidth === 0) showFallback();
});
