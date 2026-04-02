use anyhow::Result;
use esp_idf_svc::log::EspLogger;

fn main() -> Result<()> {
    esp_idf_svc::sys::link_patches();
    EspLogger::initialize_default();

    log::info!("Hello from ESP32-C3!");

    loop {
        std::thread::sleep(std::time::Duration::from_secs(1));
    }
}
