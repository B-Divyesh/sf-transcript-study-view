import './site.css';

document.querySelectorAll<HTMLAnchorElement>('.download-link').forEach((link) => {
  link.addEventListener('click', () => {
    link.dataset.clicked = 'true';
    const label = link.firstChild;
    if (label) label.textContent = 'Downloading package ';
  });
});
