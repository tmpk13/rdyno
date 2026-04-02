#![no_std]
#![no_main]

use cortex_m_rt::entry;
use panic_halt as _;
use rtt_target::{rtt_init_print, rprintln};
use rp2040_hal as hal;

#[link_section = ".boot2"]
#[used]
pub static BOOT2: [u8; 256] = rp2040_boot2::BOOT_LOADER_GENERIC_03H;

const XTAL_FREQ_HZ: u32 = 12_000_000;

#[entry]
fn main() -> ! {
    rtt_init_print!();
    let _pac = hal::pac::Peripherals::take().unwrap();
    rprintln!("Hello from RP2040!");
    loop {}
}
