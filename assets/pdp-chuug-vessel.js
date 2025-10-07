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
	
	// Validate the date
	if (isNaN(endDateTime.getTime())) {
		console.error('❌ Invalid flash sale date/time format:', flashSaleEndDate, flashSaleEndTime);
		document.querySelector('#flash-countdown-hours .flash-timer-number').textContent = '00';
		document.querySelector('#flash-countdown-minutes .flash-timer-number').textContent = '00';
		document.querySelector('#flash-countdown-seconds .flash-timer-number').textContent = '00';
		return;
	}
	
	console.log('✅ Flash countdown initialized, ends at:', endDateTime);
	
	function updateCountdown() {
		const now = new Date().getTime();
		const distance = endDateTime - now;

		if (distance < 0) {
			// Timer expired
			document.querySelector('#flash-countdown-hours .flash-timer-number').textContent = '00';
			document.querySelector('#flash-countdown-minutes .flash-timer-number').textContent = '00';
			document.querySelector('#flash-countdown-seconds .flash-timer-number').textContent = '00';
			return;
		}

		// Calculate hours, minutes, seconds
		const hours = Math.floor(distance / (1000 * 60 * 60));
		const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
		const seconds = Math.floor((distance % (1000 * 60)) / 1000);

		// Update the display with zero-padding
		document.querySelector('#flash-countdown-hours .flash-timer-number').textContent = String(hours).padStart(2, '0');
		document.querySelector('#flash-countdown-minutes .flash-timer-number').textContent = String(minutes).padStart(2, '0');
		document.querySelector('#flash-countdown-seconds .flash-timer-number').textContent = String(seconds).padStart(2, '0');
	}

	// Update immediately
	updateCountdown();

	// Update every second
	setInterval(updateCountdown, 1000);
}

// Initialize countdown timer when DOM is ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initCountdownTimer);
} else {
	initCountdownTimer();
}

