export type ToolId =
  | 'hand'
  | 'ratchet'
  | 'impact'
  | 'torque'
  | 'spark_puller'
  | 'oil_kit'
  | 'obd'
  | 'multimeter';

export type CameraPreset =
  | 'vr_fpv'
  | 'engine_bay'
  | 'wheel_brake'
  | 'underbody'
  | 'orbit_free';

export type LiftLevel = 0 | 1 | 2;

export type PartCondition = 'good' | 'fouled' | 'worn' | 'dirty' | 'low_voltage' | 'degraded';

export interface ToolSpec {
  id: ToolId;
  hotkey: string;
  nameTh: string;
  shortNameTh: string;
  specLabel: string;
  usageHint: string;
}

export interface BoltState {
  id: string;
  nameTh: string;
  sizeMm: 10 | 14 | 17 | 19;
  tightened: boolean;
  torqued: boolean;
  currentNm: number;
  targetNm: number;
  group: 'valve_cover' | 'battery' | 'airbox' | 'wheel' | 'caliper' | 'oil_pan';
}

export interface CarSimState {
  hoodOpen: boolean;
  liftLevel: LiftLevel;
  headlampOn: boolean;
  engineRunning: boolean;
  vrStereoSim: boolean;
  webXrSupported: boolean;
  webXrActive: boolean;

  // Bolts map
  bolts: Record<string, BoltState>;

  // Engine top & ignition
  valveCoverInstalled: boolean;
  coilsInstalled: [boolean, boolean, boolean, boolean];
  sparkPlugsInstalled: [boolean, boolean, boolean, boolean];
  sparkPlugConditions: [PartCondition, PartCondition, PartCondition, PartCondition];

  // Air intake
  airboxCoverInstalled: boolean;
  airFilterInstalled: boolean;
  airFilterCondition: PartCondition;

  // Battery & Electrical
  batteryConnected: boolean;
  batteryInstalled: boolean;
  batteryCondition: PartCondition;
  batteryVoltage: number;

  // Lubrication (Underbody + Top Filler)
  oilCapOpen: boolean;
  oilLevelPercent: number; // 0 to 100
  oilQuality: PartCondition; // 'degraded' or 'good'
  oilDraining: boolean;
  oilFilterInstalled: boolean;
  oilFilterCondition: PartCondition;

  // Front Right Wheel & Brake
  wheelInstalled: boolean;
  caliperInstalled: boolean;
  brakePadsInstalled: boolean;
  brakePadsCondition: PartCondition;

  // OBD-II ECU Codes
  activeDtcCodes: string[];
  obdConnected: boolean;
  lastMultimeterReading: {
    targetName: string;
    value: string;
    unit: string;
    status: 'normal' | 'warning' | 'fault';
  } | null;
}

export interface HoveredPartInfo {
  partId: string;
  nameTh: string;
  categoryTh: string;
  detailText: string;
  requiredToolHint: string;
  canInteractNow: boolean;
  blockedReason?: string;
  boltData?: BoltState;
}

export interface WorkOrderStep {
  id: string;
  labelTh: string;
  toolHintTh: string;
  checkCompleted: (state: CarSimState) => boolean;
}

export interface WorkOrder {
  id: string;
  code: string;
  titleTh: string;
  vehicleModel: string;
  customerSymptomTh: string;
  rewardBaht: number;
  steps: WorkOrderStep[];
}

export const MECHANIC_TOOLS: ToolSpec[] = [
  {
    id: 'hand',
    hotkey: '1',
    nameTh: 'ถุงมือช่าง (หยิบจับ / เปิดฝา / ประกอบอะไหล่)',
    shortNameTh: 'ถุงมือช่าง',
    specLabel: 'Manual Grip',
    usageHint: 'เปิดฝากระโปรง ถอดฝาครอบ หยิบอะไหล่เก่าออก และใส่อะไหล่ใหม่',
  },
  {
    id: 'ratchet',
    hotkey: '2',
    nameTh: 'ประแจบล็อกก๊อกแก๊ก (10 / 14 / 17 mm)',
    shortNameTh: 'ประแจบล็อก',
    specLabel: '10·14·17 mm',
    usageHint: 'ขันคลายและขันยึดน็อตฝาวาล์ว คาลิปเปอร์เบรก ขั้วแบต และน็อตถ่ายน้ำมันเครื่อง',
  },
  {
    id: 'impact',
    hotkey: '3',
    nameTh: 'บล็อกลมกระแทกแรงบิดสูง (19 mm)',
    shortNameTh: 'บล็อกลม',
    specLabel: 'Air 19 mm',
    usageHint: 'ยิงคลายและขันน็อตล้อแม็กทั้ง 5 ตัวด้วยความเร็วสูง (ต้องยกลิฟต์ก่อนถอดล้อ)',
  },
  {
    id: 'torque',
    hotkey: '4',
    nameTh: 'ประแจปอนด์วัดแรงบิดดิจิทัล (5–150 Nm)',
    shortNameTh: 'ประแจปอนด์',
    specLabel: '5–150 Nm',
    usageHint: 'คลิกค้างที่น็อตหรือหัวเทียนที่ขันยึดแล้ว เพื่ออัดแรงบิดให้ตรงค่ามาตรฐานโรงงาน',
  },
  {
    id: 'spark_puller',
    hotkey: '5',
    nameTh: 'บล็อกถอดหัวเทียนแม่เหล็กยาว (16 mm)',
    shortNameTh: 'บล็อกหัวเทียน',
    specLabel: 'Mag 16 mm',
    usageHint: 'ดึงหัวเทียนเก่าออกจากเบ้าลึก และใส่หัวเทียนอิริเดียมตัวใหม่ลงในสูบ',
  },
  {
    id: 'oil_kit',
    hotkey: '6',
    nameTh: 'ชุดกรวยเติมน้ำมันเครื่องสังเคราะห์ 5W-30',
    shortNameTh: 'ชุดเติมน้ำมัน',
    specLabel: '5W-30 API SP',
    usageHint: 'เติมน้ำมันเครื่องสังเคราะห์แท้ลงช่องเติมด้านบนเมื่อปิดน็อตอ่างน้ำมันแล้ว',
  },
  {
    id: 'obd',
    hotkey: '7',
    nameTh: 'เครื่องสแกนวิเคราะห์ระบบ OBD-II ECU',
    shortNameTh: 'สแกน OBD-II',
    specLabel: 'CAN-BUS Pro',
    usageHint: 'เสียบพอร์ต ECU เพื่ออ่านรหัสปัญหาเครื่องยนต์ (DTC) และลบไฟเตือนหลังซ่อมเสร็จ',
  },
  {
    id: 'multimeter',
    hotkey: '8',
    nameTh: 'มัลติมิเตอร์ดิจิทัลวัดไฟและคอยล์',
    shortNameTh: 'มัลติมิเตอร์',
    specLabel: 'True RMS',
    usageHint: 'แตะวัดแรงดันแบตเตอรี่ (DC V) และความต้านทานคอยล์จุดระเบิดแต่ละสูบ',
  },
];
