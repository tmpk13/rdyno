#![no_std]
#![no_main]

use cortex_m_rt::entry;
use panic_halt as _;
use rtt_target::{rtt_init_print, rprintln};
use rp235x_hal as hal;

#[link_section = ".start_block"]
#[used]
pub static IMAGE_DEF: hal::block::ImageDef = hal::block::ImageDef::secure_exe();

const XTAL_FREQ_HZ: u32 = 12_000_000;

#[entry]
fn main() -> ! {
    rtt_init_print!();
    let _pac = hal::pac::Peripherals::take().unwrap();
    rprintln!("Hello from RP2350!");
    loop {}
}
