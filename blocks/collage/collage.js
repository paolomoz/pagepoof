import { buildVideo } from '../../scripts/scripts.js';

function spanRows(row, block, i) {
  row.classList.add('span');
  if (block.children[i + 1]) block.children[i + 1].classList.add('span');
}

export default function decorate(block) {
  [...block.children].forEach((row, i) => {
    [...row.children].forEach((col) => {
      // column is empty, so row and row sibling should span
      if (col.innerHTML.trim() === '') {
        col.remove();
        spanRows(row, block, i);
      }

      // check for media
      const video = buildVideo(row);
      if (video) {
        col.classList.add('vid-wrapper');
        spanRows(row, block, i);
      }
      const img = col.querySelector('img');
      if (img) col.classList.add('img-wrapper');
      const link = col.querySelector('a[href]');
      if (link) {
        link.classList.add('emphasis');
        col.classList.add('caption');
        row.classList.add('click');
        row.addEventListener('click', () => {
          link.click();
        });
      }
    });
  });
}
