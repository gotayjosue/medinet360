// Function to add expand/collapse animation to FAQ details elements
export function expandDetails() {
  document.querySelectorAll('.faq-list details').forEach((detail) => {
    const summary = detail.querySelector('summary');
    const content = detail.querySelector('.content');

    // Remove the 'open' attribute and class initially
    detail.removeAttribute('open');
    content.style.maxHeight = '0px';

    summary.addEventListener('click', (e) => {
      e.preventDefault();

      const isOpen = detail.classList.contains('open');

      if (isOpen) {
        // Close with animation
        content.style.maxHeight = content.scrollHeight + 'px';
        requestAnimationFrame(() => {
          content.style.maxHeight = '0px';
        });

        detail.classList.remove('open');

        setTimeout(() => {
          detail.removeAttribute('open');
        }, 400); // Duration equal to the transition
      } else {
        // Open with animation
        detail.setAttribute('open', true);
        detail.classList.add('open');

        content.style.maxHeight = '0px';
        requestAnimationFrame(() => {
          content.style.maxHeight = content.scrollHeight + 'px';
        });
      }
    });
  });
}