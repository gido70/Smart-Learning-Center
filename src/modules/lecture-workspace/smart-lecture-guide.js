(function () {
  'use strict';

  const modal = document.getElementById('smartLectureGuideModal');
  const openButton = document.getElementById('openSmartLectureGuideBtn');
  const closeButtons = [
    document.getElementById('closeSmartLectureGuideBtn'),
    document.getElementById('finishSmartLectureGuideBtn')
  ].filter(Boolean);

  if (!modal || !openButton) return;

  const openGuide = () => {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.getElementById('closeSmartLectureGuideBtn')?.focus();
  };

  const closeGuide = () => {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    openButton.focus();
  };

  openButton.addEventListener('click', openGuide);
  closeButtons.forEach((button) => button.addEventListener('click', closeGuide));
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeGuide();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('open')) closeGuide();
  });

  modal.querySelectorAll('[data-guide-target]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = document.getElementById(button.dataset.guideTarget);
      closeGuide();
      window.setTimeout(() => target?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    });
  });
})();
