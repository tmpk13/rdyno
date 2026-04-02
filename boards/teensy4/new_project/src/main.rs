#![no_std]
#![no_main]

use panic_halt as _;
use rtt_target::{rtt_init_print, rprintln};
use teensy4_bsp as bsp;

#[bsp::rt::entry]
fn main() -> ! {
    rtt_init_print!();
    let _peripherals = bsp::Peripherals::take();
    rprintln!("Hello from Teensy 4.0!");
    loop {}
}
