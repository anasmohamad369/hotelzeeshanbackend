const escpos = require('escpos');
escpos.USB = require('escpos-usb');

try {
    // Attempt to auto-detect USB device
    const device = new escpos.USB();

    device.open(function (error) {
        if (error) {
            console.error('❌ Error opening device:', error);
            process.exit(1);
        }

        console.log('✅ Printer connected successfully!');
        const printer = new escpos.Printer(device);

        printer
            .font('a')
            .align('ct')
            .style('b')
            .size(1, 1)
            .text('Test Print Successful')
            .cut()
            .close();

        process.exit(0);
    });
} catch (err) {
    console.error('❌ device detection failed:', err);
    process.exit(1);
}
