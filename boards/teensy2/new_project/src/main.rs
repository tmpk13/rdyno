#![no_std]
#![no_main]

use avr_device::atmega32u4 as pac;
use panic_halt as _;

#[avr_device::entry]
fn main() -> ! {
    let _dp = pac::Peripherals::take().unwrap();
    loop {}
}
