// Flash Sale Countdown Timer Function
function initCountdownTimer() {
	const flashSaleEndDateElement = document.querySelector('[data-flash-sale-end-date]');
	const flashSaleEndTimeElement = document.querySelector('[data-flash-sale-end-time]');
	
	if (!flashSaleEndDateElement || !flashSaleEndTimeElement) {
		return;
	}

	const flashSaleEndDate = flashSaleEndDateElement.getAttribute('data-flash-sale-end-date');
	const flashSaleEndTime = flashSaleEndTimeElement.getAttribute('data-flash-sale-end-time');
	
	if (!flashSaleEndDate || !flashSaleEndTime) {
		return;
	}

	// Combine date and time
	const endDateTime = new Date(`${flashSaleEndDate}T${flashSaleEndTime}`);
	
	function updateCountdown() {
		const now = new Date().getTime();
		const distance = endDateTime - now;

		if (distance < 0) {
			// Timer expired
			document.getElementById('flash-countdown-days').textContent = '00';
			document.getElementById('flash-countdown-hours').textContent = '00';
			document.getElementById('flash-countdown-minutes').textContent = '00';
			return;
		}

		// Calculate days, hours, minutes
		const days = Math.floor(distance / (1000 * 60 * 60 * 24));
		const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
		const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

		// Update the display with zero-padding
		document.getElementById('flash-countdown-days').textContent = String(days).padStart(2, '0');
		document.getElementById('flash-countdown-hours').textContent = String(hours).padStart(2, '0');
		document.getElementById('flash-countdown-minutes').textContent = String(minutes).padStart(2, '0');
	}

	// Update immediately
	updateCountdown();

	// Update every minute
	setInterval(updateCountdown, 60000);
}

// Initialize countdown timer when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initCountdownTimer);
} else {
	initCountdownTimer();
}

