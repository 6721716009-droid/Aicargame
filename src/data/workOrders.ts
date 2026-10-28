import { BoltState, CarSimState, WorkOrder } from '../types/mechanic';

function createBaseBolts(): Record<string, BoltState> {
  return {
    vc_bolt_1: {
      id: 'vc_bolt_1',
      nameTh: 'น็อตฝาครอบวาล์ว #1 (หน้าซ้าย)',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 25,
      targetNm: 25,
      group: 'valve_cover',
    },
    vc_bolt_2: {
      id: 'vc_bolt_2',
      nameTh: 'น็อตฝาครอบวาล์ว #2 (หน้าขวา)',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 25,
      targetNm: 25,
      group: 'valve_cover',
    },
    vc_bolt_3: {
      id: 'vc_bolt_3',
      nameTh: 'น็อตฝาครอบวาล์ว #3 (หลังซ้าย)',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 25,
      targetNm: 25,
      group: 'valve_cover',
    },
    vc_bolt_4: {
      id: 'vc_bolt_4',
      nameTh: 'น็อตฝาครอบวาล์ว #4 (หลังขวา)',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 25,
      targetNm: 25,
      group: 'valve_cover',
    },
    batt_bolt_pos: {
      id: 'batt_bolt_pos',
      nameTh: 'น็อตประกับขั้วแบตเตอรี่บวก (+)',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 12,
      targetNm: 12,
      group: 'battery',
    },
    batt_bolt_neg: {
      id: 'batt_bolt_neg',
      nameTh: 'น็อตประกับขั้วแบตเตอรี่ลบ (-)',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 12,
      targetNm: 12,
      group: 'battery',
    },
    airbox_bolt_1: {
      id: 'airbox_bolt_1',
      nameTh: 'สกรูยึดหม้อกรองอากาศ #1',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 10,
      targetNm: 10,
      group: 'airbox',
    },
    airbox_bolt_2: {
      id: 'airbox_bolt_2',
      nameTh: 'สกรูยึดหม้อกรองอากาศ #2',
      sizeMm: 10,
      tightened: true,
      torqued: true,
      currentNm: 10,
      targetNm: 10,
      group: 'airbox',
    },
    oil_drain_plug: {
      id: 'oil_drain_plug',
      nameTh: 'น็อตถ่ายน้ำมันเครื่องใต้ท้องอ่าง (17mm)',
      sizeMm: 17,
      tightened: true,
      torqued: true,
      currentNm: 40,
      targetNm: 40,
      group: 'oil_pan',
    },
    caliper_bolt_top: {
      id: 'caliper_bolt_top',
      nameTh: 'น็อตสลักคาลิปเปอร์เบรกตัวบน (14mm)',
      sizeMm: 14,
      tightened: true,
      torqued: true,
      currentNm: 35,
      targetNm: 35,
      group: 'caliper',
    },
    caliper_bolt_bot: {
      id: 'caliper_bolt_bot',
      nameTh: 'น็อตสลักคาลิปเปอร์เบรกตัวล่าง (14mm)',
      sizeMm: 14,
      tightened: true,
      torqued: true,
      currentNm: 35,
      targetNm: 35,
      group: 'caliper',
    },
    lug_1: {
      id: 'lug_1',
      nameTh: 'น็อตล้อแม็ก #1 (19mm)',
      sizeMm: 19,
      tightened: true,
      torqued: true,
      currentNm: 110,
      targetNm: 110,
      group: 'wheel',
    },
    lug_2: {
      id: 'lug_2',
      nameTh: 'น็อตล้อแม็ก #2 (19mm)',
      sizeMm: 19,
      tightened: true,
      torqued: true,
      currentNm: 110,
      targetNm: 110,
      group: 'wheel',
    },
    lug_3: {
      id: 'lug_3',
      nameTh: 'น็อตล้อแม็ก #3 (19mm)',
      sizeMm: 19,
      tightened: true,
      torqued: true,
      currentNm: 110,
      targetNm: 110,
      group: 'wheel',
    },
    lug_4: {
      id: 'lug_4',
      nameTh: 'น็อตล้อแม็ก #4 (19mm)',
      sizeMm: 19,
      tightened: true,
      torqued: true,
      currentNm: 110,
      targetNm: 110,
      group: 'wheel',
    },
    lug_5: {
      id: 'lug_5',
      nameTh: 'น็อตล้อแม็ก #5 (19mm)',
      sizeMm: 19,
      tightened: true,
      torqued: true,
      currentNm: 110,
      targetNm: 110,
      group: 'wheel',
    },
  };
}

export function createInitialStateForOrder(
  orderId: string,
  webXrSupported = false
): CarSimState {
  const base: CarSimState = {
    hoodOpen: false,
    liftLevel: 0,
    headlampOn: false,
    engineRunning: false,
    vrStereoSim: false,
    webXrSupported,
    webXrActive: false,
    bolts: createBaseBolts(),
    valveCoverInstalled: true,
    coilsInstalled: [true, true, true, true],
    sparkPlugsInstalled: [true, true, true, true],
    sparkPlugConditions: ['good', 'good', 'good', 'good'],
    airboxCoverInstalled: true,
    airFilterInstalled: true,
    airFilterCondition: 'good',
    batteryConnected: true,
    batteryInstalled: true,
    batteryCondition: 'good',
    batteryVoltage: 12.6,
    oilCapOpen: false,
    oilLevelPercent: 88,
    oilQuality: 'good',
    oilDraining: false,
    oilFilterInstalled: true,
    oilFilterCondition: 'good',
    wheelInstalled: true,
    caliperInstalled: true,
    brakePadsInstalled: true,
    brakePadsCondition: 'good',
    activeDtcCodes: [],
    obdConnected: false,
    lastMultimeterReading: null,
  };

  if (orderId === 'order_misfire') {
    base.sparkPlugConditions = ['good', 'fouled', 'good', 'fouled'];
    base.batteryCondition = 'low_voltage';
    base.batteryVoltage = 11.4;
    base.activeDtcCodes = [
      'P0302 — สูบที่ 2 จุดระเบิดผิดพลาด (หัวเทียนเขม่าจับหนา)',
      'P0304 — สูบที่ 4 จุดระเบิดผิดพลาด (หัวเทียนเสื่อมสภาพ)',
      'P0562 — แรงดันไฟแบตเตอรี่ต่ำกว่าเกณฑ์ (11.4V)',
    ];
  } else if (orderId === 'order_oil_service') {
    base.oilQuality = 'degraded';
    base.oilLevelPercent = 42;
    base.oilFilterCondition = 'dirty';
    base.airFilterCondition = 'dirty';
    base.activeDtcCodes = [
      'P0524 — แรงดันน้ำมันเครื่องต่ำและเสื่อมสภาพตามระยะ',
      'P0171 — อากาศไหลเข้าอั้น (ไส้กรองอากาศอุดตัน)',
    ];
  } else if (orderId === 'order_brake_overhaul') {
    base.brakePadsCondition = 'worn';
    base.activeDtcCodes = [
      'C0035 — เซนเซอร์เตือนผ้าเบรกหน้าขวาสึกหรอเกินพิกัด (< 2mm)',
    ];
  }

  return base;
}

export const WORK_ORDERS: WorkOrder[] = [
  {
    id: 'order_misfire',
    code: 'WO-104',
    titleTh: 'แก้ปัญหาเครื่องเดินสะดุด ไฟโชว์ และเปลี่ยนแบตเตอรี่',
    vehicleModel: 'Apex GT-R200 2.0T DOHC',
    customerSymptomTh:
      'เครื่องยนต์สั่นกระตุกที่รอบเดินเบา เร่งแซงสะดุด สตาร์ทอืดตอนเช้า และไฟเตือนรูปเครื่องยนต์สว่างค้าง',
    rewardBaht: 4850,
    steps: [
      {
        id: 'open_hood',
        labelTh: 'เปิดฝากระโปรงหน้ารถ และเสียบเครื่องสแกน OBD-II ตรวจเช็กรหัสปัญหา',
        toolHintTh: 'ถุงมือช่าง (1) + สแกน OBD-II (7)',
        checkCompleted: (s) => s.hoodOpen && s.obdConnected,
      },
      {
        id: 'replace_plugs',
        labelTh: 'ถอดฝาครอบวาล์ว ดึงคอยล์และเปลี่ยนหัวเทียนอิริเดียมใหม่ในสูบ 2 และสูบ 4',
        toolHintTh: 'ประแจบล็อก (2) + ถุงมือ (1) + บล็อกหัวเทียน (5)',
        checkCompleted: (s) =>
          s.sparkPlugsInstalled.every(Boolean) &&
          s.sparkPlugConditions.every((c) => c === 'good') &&
          s.coilsInstalled.every(Boolean),
      },
      {
        id: 'torque_valve_cover',
        labelTh: 'ประกอบฝาครอบวาล์วกลับ และขันประแจปอนด์น็อตฝาวาล์วทั้ง 4 ตัวที่ 25 Nm',
        toolHintTh: 'ประแจบล็อก (2) + ประแจปอนด์ (4)',
        checkCompleted: (s) =>
          s.valveCoverInstalled &&
          ['vc_bolt_1', 'vc_bolt_2', 'vc_bolt_3', 'vc_bolt_4'].every(
            (id) => s.bolts[id].tightened && s.bolts[id].torqued
          ),
      },
      {
        id: 'replace_battery',
        labelTh: 'ขันขั้วแบตเตอรี่ เปลี่ยนแบตเตอรี่ลูกใหม่ (12.7V) และขันยึดประกับขั้วบวก-ลบ',
        toolHintTh: 'มัลติมิเตอร์ (8) + ประแจบล็อก (2) + ถุงมือ (1)',
        checkCompleted: (s) =>
          s.batteryInstalled &&
          s.batteryCondition === 'good' &&
          s.bolts.batt_bolt_pos.tightened &&
          s.bolts.batt_bolt_neg.tightened,
      },
      {
        id: 'clear_dtc_test',
        labelTh: 'ลบโค้ดไฟเตือนในเครื่องสแกน OBD-II และสตาร์ทเครื่องยนต์เดินเรียบ',
        toolHintTh: 'สแกน OBD-II (7) + ปุ่มสตาร์ทเครื่อง',
        checkCompleted: (s) => s.activeDtcCodes.length === 0 && s.engineRunning,
      },
    ],
  },
  {
    id: 'order_oil_service',
    code: 'WO-209',
    titleTh: 'เซอร์วิสถ่ายน้ำมันเครื่องสังเคราะห์ 5W-30 และเปลี่ยนกรองครบชุด',
    vehicleModel: 'Apex GT-R200 2.0T DOHC',
    customerSymptomTh:
      'ครบกำหนดเช็กระยะ 10,000 กม. น้ำมันเครื่องดำข้นระดับพร่อง ไส้กรองน้ำมันและกรองอากาศสกปรกอุดตัน',
    rewardBaht: 3600,
    steps: [
      {
        id: 'lift_and_drain',
        labelTh: 'ยกลิฟต์ระดับใต้ท้องรถ ขันน็อตอ่างน้ำมัน 17mm เพื่อถ่ายน้ำมันเครื่องเก่าออกจนหมด',
        toolHintTh: 'สวิตช์ลิฟต์สูงสุด + ประแจบล็อก (2)',
        checkCompleted: (s) =>
          (s.oilQuality === 'good' || s.oilLevelPercent === 0) && !s.oilDraining,
      },
      {
        id: 'replace_oil_filter_torque',
        labelTh: 'เปลี่ยนกรองน้ำมันเครื่องลูกใหม่ใต้ท้องรถ และขันปอนด์น็อตอ่างน้ำมันที่ 40 Nm',
        toolHintTh: 'ถุงมือ (1) + ประแจบล็อก (2) + ประแจปอนด์ (4)',
        checkCompleted: (s) =>
          s.oilFilterInstalled &&
          s.oilFilterCondition === 'good' &&
          s.bolts.oil_drain_plug.tightened &&
          s.bolts.oil_drain_plug.torqued,
      },
      {
        id: 'refill_synthetic_oil',
        labelTh: 'ลดลิฟต์ เปิดฝาเติมน้ำมันด้านบน เติมน้ำมันสังเคราะห์ 5W-30 (80–100%) แล้วปิดฝา',
        toolHintTh: 'ถุงมือ (1) + ชุดเติมน้ำมัน (6)',
        checkCompleted: (s) =>
          s.oilQuality === 'good' &&
          s.oilLevelPercent >= 80 &&
          !s.oilCapOpen,
      },
      {
        id: 'replace_air_filter',
        labelTh: 'เปิดหม้อกรองอากาศ เปลี่ยนไส้กรองอากาศใหม่ และขันสกรูหม้อกรองครบ 2 ตัว',
        toolHintTh: 'ประแจบล็อก (2) + ถุงมือ (1)',
        checkCompleted: (s) =>
          s.airFilterInstalled &&
          s.airFilterCondition === 'good' &&
          s.airboxCoverInstalled &&
          s.bolts.airbox_bolt_1.tightened &&
          s.bolts.airbox_bolt_2.tightened,
      },
      {
        id: 'clear_codes_oil',
        labelTh: 'ลบโค้ดแจ้งเตือน OBD-II และสตาร์ทเครื่องทดสอบแรงดันน้ำมันเครื่อง',
        toolHintTh: 'สแกน OBD-II (7) + ปุ่มสตาร์ทเครื่อง',
        checkCompleted: (s) => s.activeDtcCodes.length === 0 && s.engineRunning,
      },
    ],
  },
  {
    id: 'order_brake_overhaul',
    code: 'WO-315',
    titleTh: 'โอเวอร์ฮอลผ้าเบรกเซรามิกหน้าขวา และขันปอนด์น็อตล้อ 110 Nm',
    vehicleModel: 'Apex GT-R200 2.0T DOHC',
    customerSymptomTh:
      'มีเสียงเหล็กสีกันขณะเหยียบเบรกที่ล้อหน้าขวา ผ้าเบรกสึกบางต่ำกว่าเกณฑ์ความปลอดภัย',
    rewardBaht: 4200,
    steps: [
      {
        id: 'lift_remove_wheel',
        labelTh: 'ยกลิฟต์ระดับซุ้มล้อ ใช้บล็อกลมยิงน็อตล้อ 19mm ทั้ง 5 ตัว และยกถอดล้อออก',
        toolHintTh: 'ลิฟต์ระดับล้อ + บล็อกลม (3) + ถุงมือ (1)',
        checkCompleted: (s) => !s.wheelInstalled || s.brakePadsCondition === 'good',
      },
      {
        id: 'replace_ceramic_pads',
        labelTh: 'ขันน็อตคาลิปเปอร์ 14mm ถอดคาลิปเปอร์เบรก และเปลี่ยนผ้าเบรกเซรามิกชุดใหม่',
        toolHintTh: 'ประแจบล็อก (2) + ถุงมือ (1)',
        checkCompleted: (s) =>
          s.brakePadsInstalled && s.brakePadsCondition === 'good',
      },
      {
        id: 'reinstall_caliper_torque',
        labelTh: 'ประกอบคาลิปเปอร์เบรกกลับ และใช้ประแจปอนด์ขันสลักทั้ง 2 ตัวที่ 35 Nm',
        toolHintTh: 'ถุงมือ (1) + ประแจบล็อก (2) + ประแจปอนด์ (4)',
        checkCompleted: (s) =>
          s.caliperInstalled &&
          s.bolts.caliper_bolt_top.tightened &&
          s.bolts.caliper_bolt_top.torqued &&
          s.bolts.caliper_bolt_bot.tightened &&
          s.bolts.caliper_bolt_bot.torqued,
      },
      {
        id: 'reinstall_wheel_torque_110',
        labelTh: 'ใส่ล้อแม็ก ยิงน็อตล้อครบ 5 ตัว และใช้ประแจปอนด์ขันตึงมาตรฐาน 110 Nm ทุกตัว',
        toolHintTh: 'ถุงมือ (1) + บล็อกลม (3) + ประแจปอนด์ (4)',
        checkCompleted: (s) =>
          s.wheelInstalled &&
          ['lug_1', 'lug_2', 'lug_3', 'lug_4', 'lug_5'].every(
            (id) => s.bolts[id].tightened && s.bolts[id].torqued
          ),
      },
      {
        id: 'clear_abs_code',
        labelTh: 'เสียบสแกน OBD-II เพื่อเคลียร์โค้ดเตือนผ้าเบรก C0035',
        toolHintTh: 'สแกน OBD-II (7)',
        checkCompleted: (s) => s.activeDtcCodes.length === 0,
      },
    ],
  },
];
