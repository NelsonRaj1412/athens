import React from 'react';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  SafetyOutlined,
  FormOutlined,
  FileTextOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  BarChartOutlined,
  AuditOutlined,
  ReadOutlined,
  MessageOutlined,
  ProjectOutlined,
  ExperimentOutlined,
  SettingOutlined,
  BellOutlined,
  CalendarOutlined,
  BookOutlined,
  ToolOutlined,
  DatabaseOutlined,
  ApiOutlined,
  LineChartOutlined,
  FileSearchOutlined,
  UsergroupAddOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  BugOutlined,
  RocketOutlined,
  SecurityScanOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  UploadOutlined,
  SyncOutlined,
  CloudOutlined,
  LockOutlined,
  UnlockOutlined,
  KeyOutlined,
  MailOutlined,
  PhoneOutlined,
  GlobalOutlined,
  HomeOutlined,
  EnvironmentOutlined,
  CarOutlined,
  MedicineBoxOutlined,
  FireOutlined,
  ThunderboltOutlined,
  BuildOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
  WarningOutlined,
  StopOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  FastForwardOutlined,
  BackwardOutlined,
  StepForwardOutlined,
  StepBackwardOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignBottomOutlined,
  MenuOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  OrderedListOutlined,
  TableOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  ColumnHeightOutlined,
  DotChartOutlined,
  FundOutlined,
  RadarChartOutlined,
  HeatMapOutlined,
  BoxPlotOutlined,
  StockOutlined,
  SlackOutlined,
  TwitterOutlined,
  FacebookOutlined,
  LinkedinOutlined,
  GithubOutlined,
  GitlabOutlined,
  YoutubeOutlined,
  InstagramOutlined,
  SkypeOutlined,
  WechatOutlined,
  QqOutlined,
  DingdingOutlined,
  WeiboOutlined,
  TaobaoOutlined,
  AlipayOutlined,
  ZhihuOutlined,
  RedditOutlined,
  WindowsOutlined,
  ChromeOutlined,
  IeOutlined,
  AndroidOutlined,
  AppleOutlined,
  CloudServerOutlined,
  SketchOutlined,
  DropboxOutlined,
  GoogleOutlined,
  YahooOutlined,
  PayCircleOutlined,
  CreditCardOutlined,
  HeartOutlined,
  StarOutlined,
  LikeOutlined,
  DislikeOutlined,
  SmileOutlined,
  FrownOutlined,
  MehOutlined,
  CopyOutlined,
  ScissorOutlined,
  HighlightOutlined,
  FontColorsOutlined,
  FontSizeOutlined,
  BoldOutlined,
  ItalicOutlined,
  UnderlineOutlined,
  StrikethroughOutlined,
  RedoOutlined,
  UndoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  FolderOpenOutlined,
  FolderOutlined,
  FolderAddOutlined,
  FileOutlined,
  FileAddOutlined,
  FileDoneOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileJpgOutlined,
  FilePdfOutlined,
  FilePptOutlined,
  FileWordOutlined,
  FileZipOutlined,
  FileUnknownOutlined,
  FileMarkdownOutlined,
  SaveOutlined,
  ImportOutlined,
  ExportOutlined,
  InboxOutlined,
  AppstoreAddOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  PicLeftOutlined,
  PicCenterOutlined,
  PicRightOutlined,
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  BgColorsOutlined,
  BorderOutlined,
  BorderlessTableOutlined,
  ClearOutlined,
  DashOutlined,
  SmallDashOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  DragOutlined,
  OrderedListOutlined as NumberedListOutlined,
  RadiusBottomleftOutlined,
  RadiusBottomrightOutlined,
  RadiusUpleftOutlined,
  RadiusUprightOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  QuestionOutlined,
  MinusOutlined,
  PlusCircleOutlined,
  MinusCircleOutlined,
  InfoOutlined,
  ExclamationOutlined,
  CloseOutlined,
  CheckOutlined,
  ClockCircleOutlined as TimeOutlined,
  SwapOutlined,
  SwapLeftOutlined,
  SwapRightOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  UpOutlined,
  DownOutlined,
  LeftOutlined,
  RightOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  CaretLeftOutlined,
  CaretRightOutlined,
  UpCircleOutlined,
  DownCircleOutlined,
  LeftCircleOutlined,
  RightCircleOutlined,
  DoubleRightOutlined,
  DoubleLeftOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
  VerticalAlignMiddleOutlined,
  ForwardOutlined,
  BackwardOutlined as BackOutlined,
  EnterOutlined,
  RetweetOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  LinkOutlined,
  WifiOutlined,
  ApiOutlined as ConnectOutlined,
  FilterOutlined,
  FunnelPlotOutlined,
  MonitorOutlined,
  LaptopOutlined,
  MobileOutlined,
  TabletOutlined,
  RedEnvelopeOutlined,
  BookOutlined as ManualOutlined,
  GiftOutlined,
  NotificationOutlined,
  SoundOutlined,
  AudioOutlined,
  VideoCameraOutlined,
  CameraOutlined,
  ScanOutlined,
  SearchOutlined,
  ZoomInOutlined as MagnifyOutlined,
  AimOutlined,
  CompassOutlined,
  ExpandOutlined,
  NodeCollapseOutlined,
  ExpandAltOutlined,
  ShrinkOutlined,
  ArrowsAltOutlined,
  SendOutlined,
  EllipsisOutlined,
  BorderInnerOutlined,
  BorderOuterOutlined,
  RadiusSettingOutlined,
  BuildOutlined as ConstructionOutlined,
  RobotOutlined,
  ExperimentOutlined as LabOutlined,
  BulbOutlined,
  ExperimentOutlined as TestOutlined,
  BugOutlined as DebugOutlined,
  CodeOutlined,
  ConsoleSqlOutlined,
  FunctionOutlined,
  BranchesOutlined,
  PullRequestOutlined,
  MergeCellsOutlined,
  SplitCellsOutlined,
  FieldTimeOutlined,
  FieldNumberOutlined,
  FieldStringOutlined,
  FieldBinaryOutlined,
  InsertRowAboveOutlined,
  InsertRowBelowOutlined,
  InsertRowLeftOutlined,
  InsertRowRightOutlined,
  DeleteRowOutlined,
  DeleteColumnOutlined,
  MergeCellsOutlined as MergeOutlined,
  AppstoreOutlined as GridOutlined,
  MenuOutlined as ListViewOutlined,
  ProfileOutlined,
  SolutionOutlined,
  TeamOutlined as GroupOutlined,
  UserAddOutlined,
  UserDeleteOutlined,
  UsergroupDeleteOutlined,
  IdcardOutlined,
  ContactsOutlined,
  CarryOutOutlined,
  CalendarOutlined as ScheduleOutlined,
  FlagOutlined,
  FontSizeOutlined as TextOutlined,
  SmallDashOutlined as LineOutlined,
  TrophyOutlined,
} from '@ant-design/icons';

export interface MenuItem {
  key: string;
  icon?: React.ReactNode;
  label: string;
  children?: MenuItem[];
  disabled?: boolean;
  danger?: boolean;
}

export interface MenuConfig {
  userType: string;
  djangoUserType?: string;
  menuItems: MenuItem[];
}

/**
 * Restricted menu for unapproved users
 * Only shows essential items needed for profile completion and approval
 */
const getRestrictedMenuItems = (django_user_type: string, hasSubmittedDetails: boolean): MenuItem[] => {
  const baseItems: MenuItem[] = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
  ];

  if (django_user_type === 'projectadmin') {
    baseItems.push({
      key: '/dashboard/admindetail',
      icon: <UserOutlined />,
      label: hasSubmittedDetails ? 'Admin Detail (Pending Approval)' : 'Admin Detail (Required)',
    });
  } else if (django_user_type === 'adminuser') {
    baseItems.push({
      key: '/dashboard/userdetail',
      icon: <UserOutlined />,
      label: hasSubmittedDetails ? 'User Detail (Pending Approval)' : 'User Detail (Required)',
    });
  }

  return baseItems;
};

/**
 * Centralized menu configuration for all user types
 * This eliminates the dual menu system and provides a single source of truth
 */
export const getMenuItemsForUser = (
  usertype?: string,
  django_user_type?: string,
  isApproved: boolean = true,
  hasSubmittedDetails: boolean = true
): MenuItem[] => {

  // If user is not approved, return restricted menu
  if (!isApproved && (django_user_type === 'projectadmin' || django_user_type === 'adminuser')) {
    return getRestrictedMenuItems(django_user_type, hasSubmittedDetails);
  }

  // Master admin - full system access
  if (usertype === 'master') {
    return [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
      { key: '/dashboard/projects', icon: <ProjectOutlined />, label: 'Projects' },
      { key: '/dashboard/adminusers', icon: <TeamOutlined />, label: 'Admin Users' },
      {
        key: 'system',
        icon: <SettingOutlined />,
        label: 'System Management',
        children: [
          { key: '/dashboard/system/settings', icon: <SettingOutlined />, label: 'Settings' },
          { key: '/dashboard/system/logs', icon: <FileTextOutlined />, label: 'System Logs' },
          { key: '/dashboard/system/backup', icon: <DatabaseOutlined />, label: 'Backup' },
        ]
      }
    ];
  }

  // Admin user - comprehensive access
  if (django_user_type === 'adminuser') {
    return [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
      { key: '/dashboard/attendance', icon: <ClockCircleOutlined />, label: 'Mark Attendance' },
      { key: '/dashboard/chatbox', icon: <MessageOutlined />, label: 'Chat Box' },
      { key: '/dashboard/voice-translator', icon: <SoundOutlined />, label: 'Voice Translator' },
      { key: '/dashboard/workers', icon: <TeamOutlined />, label: 'Workers' },
      { key: '/dashboard/manpower', icon: <TeamOutlined />, label: 'Manpower' },
      { key: '/dashboard/userdetail', icon: <UserOutlined />, label: 'User Detail' },
      {
        key: 'training',
        icon: <AuditOutlined />,
        label: 'Training',
        children: [
          { key: '/dashboard/inductiontraining', icon: <ReadOutlined />, label: 'Induction Training' },
          { key: '/dashboard/jobtraining', icon: <ReadOutlined />, label: 'Job Training' },
          { key: '/dashboard/toolboxtalk', icon: <BookOutlined />, label: 'Toolbox Talk' },
        ]
      },
      {
        key: 'safetyobservation',
        icon: <SafetyOutlined />,
        label: 'Safety Observation',
        children: [
          { key: '/dashboard/safetyobservation/form', icon: <FormOutlined />, label: 'Observation Form' },
          { key: '/dashboard/safetyobservation/list', icon: <TeamOutlined />, label: 'Observation List' },
        ]
      },
      {
        key: 'incidentmanagement',
        icon: <SafetyOutlined />,
        label: 'Incident Management',
        children: [
          { key: '/dashboard/incidentmanagement/incidents', icon: <FileTextOutlined />, label: 'All Incidents' },
          { key: '/dashboard/incidentmanagement/create', icon: <PlusOutlined />, label: 'Report Incident' },
          { key: '/dashboard/incidentmanagement', icon: <BarChartOutlined />, label: 'Dashboard' },
        ]
      },
      {
        key: 'ptw',
        icon: <FormOutlined />,
        label: 'Permits to Work',
        children: [
          { key: '/dashboard/ptw', icon: <FileTextOutlined />, label: 'All Permits' },
          { key: '/dashboard/ptw/create', icon: <PlusOutlined />, label: 'Create Permit' },
          { key: '/dashboard/ptw/pending-approvals', icon: <ClockCircleOutlined />, label: 'Pending Approvals' },
          { key: '/dashboard/ptw/dashboard', icon: <BarChartOutlined />, label: 'Dashboard' }
        ]
      },
      {
        key: 'inspection',
        icon: <ExperimentOutlined />,
        label: 'Inspections',
        children: [
          { key: '/dashboard/inspection', icon: <FileTextOutlined />, label: 'All Inspections' },
          { key: '/dashboard/inspection/create', icon: <PlusOutlined />, label: 'Create Inspection' },
          { key: '/dashboard/inspection/reports', icon: <BarChartOutlined />, label: 'Reports' }
        ]
      },
      {
        key: 'esg',
        icon: <EnvironmentOutlined />,
        label: 'ESG Management',
        children: [
          { key: '/dashboard/esg', icon: <DashboardOutlined />, label: 'ESG Overview' },
          {
            key: 'environment',
            icon: <EnvironmentOutlined />,
            label: 'Environmental Management',
            children: [
              { key: '/dashboard/esg/environment?tab=aspects', icon: <EnvironmentOutlined />, label: 'Environment Aspects' },
              { key: '/dashboard/esg/environment?tab=generation', icon: <ThunderboltOutlined />, label: 'Generation Data' },
              { key: '/dashboard/esg/environment?tab=waste', icon: <DeleteOutlined />, label: 'Waste Management' },
              { key: '/dashboard/esg/environment?tab=biodiversity', icon: <BugOutlined />, label: 'Biodiversity Events' },
              { key: '/dashboard/esg/monitoring', icon: <ExperimentOutlined />, label: 'Environmental Monitoring' },
              { key: '/dashboard/esg/carbon-footprint', icon: <GlobalOutlined />, label: 'Carbon Footprint' },
              { key: '/dashboard/esg/water-management', icon: <DropboxOutlined />, label: 'Water Management' },
              { key: '/dashboard/esg/energy-management', icon: <ThunderboltOutlined />, label: 'Energy Management' },
              { key: '/dashboard/esg/environmental-incidents', icon: <AlertOutlined />, label: 'Environmental Incidents' },
            ]
          },
          { key: '/dashboard/esg/sustainability-targets', icon: <TrophyOutlined />, label: 'Sustainability Targets' },
          { key: '/dashboard/esg/governance', icon: <AuditOutlined />, label: 'Governance' },
          { key: '/dashboard/esg/reports', icon: <BarChartOutlined />, label: 'ESG Reports' },
        ]
      },
      {
        key: 'quality',
        icon: <CheckCircleOutlined />,
        label: 'Quality Management',
        children: [
          { key: '/dashboard/quality', icon: <DashboardOutlined />, label: 'Executive Dashboard' },
          { key: '/dashboard/quality/enhanced', icon: <LineChartOutlined />, label: 'Analytics & KPIs' },
          { key: '/dashboard/quality/inspections', icon: <ExperimentOutlined />, label: 'Quality Inspections' },
          { key: '/dashboard/quality/inspections/create', icon: <PlusOutlined />, label: 'New Inspection' },
          { key: '/dashboard/quality/suppliers', icon: <TeamOutlined />, label: 'Supplier Quality' },
          { key: '/dashboard/quality/defects', icon: <BugOutlined />, label: 'Defect Management' },
          { key: '/dashboard/quality/templates', icon: <FileTextOutlined />, label: 'Quality Templates' },
          { key: '/dashboard/quality/standards', icon: <TrophyOutlined />, label: 'Quality Standards' },
          { key: '/dashboard/quality/alerts', icon: <AlertOutlined />, label: 'Quality Alerts' },
        ]
      },
      { key: '/dashboard/mom', icon: <CalendarOutlined />, label: 'Minutes of Meeting' },
    ];
  }

  // Project admins (client, epc, contractor)
  if (['client', 'epc'].includes(usertype ?? '') || usertype?.includes('contractor')) {
    const baseMenuItems: MenuItem[] = [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
      { key: '/dashboard/attendance', icon: <ClockCircleOutlined />, label: 'Mark Attendance' },
      { key: '/dashboard/voice-translator', icon: <SoundOutlined />, label: 'Voice Translator' },
      { key: '/dashboard/users', icon: <UserOutlined />, label: 'Users' },
      { key: '/dashboard/admindetail', icon: <UserOutlined />, label: 'Admin Detail' },
    ];

    // Add comprehensive modules
    baseMenuItems.push(
      {
        key: 'incidentmanagement',
        icon: <SafetyOutlined />,
        label: 'Incident Management',
        children: [
          { key: '/dashboard/incidentmanagement/incidents', icon: <FileTextOutlined />, label: 'All Incidents' },
          { key: '/dashboard/incidentmanagement/create', icon: <PlusOutlined />, label: 'Report Incident' },
          { key: '/dashboard/incidentmanagement', icon: <BarChartOutlined />, label: 'Dashboard' },
        ]
      },
      {
        key: 'ptw',
        icon: <FormOutlined />,
        label: 'Permits to Work',
        children: [
          { key: '/dashboard/ptw', icon: <FileTextOutlined />, label: 'All Permits' },
          { key: '/dashboard/ptw/create', icon: <PlusOutlined />, label: 'Create Permit' },
          { key: '/dashboard/ptw/pending-approvals', icon: <ClockCircleOutlined />, label: 'Pending Approvals' },
          { key: '/dashboard/ptw/dashboard', icon: <BarChartOutlined />, label: 'Dashboard' },
          { key: '/dashboard/ptw/reports', icon: <BarChartOutlined />, label: 'Reports' }
        ]
      },
      {
        key: 'inspection',
        icon: <ExperimentOutlined />,
        label: 'Inspections',
        children: [
          { key: '/dashboard/inspection', icon: <FileTextOutlined />, label: 'All Inspections' },
          { key: '/dashboard/inspection/create', icon: <PlusOutlined />, label: 'Create Inspection' },
          { key: '/dashboard/inspection/reports', icon: <BarChartOutlined />, label: 'Reports' }
        ]
      },
      {
        key: 'esg',
        icon: <EnvironmentOutlined />,
        label: 'ESG Management',
        children: [
          { key: '/dashboard/esg', icon: <DashboardOutlined />, label: 'ESG Overview' },
          {
            key: 'environment',
            icon: <EnvironmentOutlined />,
            label: 'Environmental Management',
            children: [
              { key: '/dashboard/esg/environment?tab=aspects', icon: <EnvironmentOutlined />, label: 'Environment Aspects' },
              { key: '/dashboard/esg/environment?tab=generation', icon: <ThunderboltOutlined />, label: 'Generation Data' },
              { key: '/dashboard/esg/environment?tab=waste', icon: <DeleteOutlined />, label: 'Waste Management' },
              { key: '/dashboard/esg/environment?tab=biodiversity', icon: <BugOutlined />, label: 'Biodiversity Events' },
              { key: '/dashboard/esg/monitoring', icon: <ExperimentOutlined />, label: 'Environmental Monitoring' },
              { key: '/dashboard/esg/carbon-footprint', icon: <GlobalOutlined />, label: 'Carbon Footprint' },
              { key: '/dashboard/esg/sustainability-targets', icon: <TrophyOutlined />, label: 'Sustainability Targets' },
            ]
          },
          { key: '/dashboard/esg/governance', icon: <AuditOutlined />, label: 'Governance' },
          { key: '/dashboard/esg/reports', icon: <BarChartOutlined />, label: 'ESG Reports' },
        ]
      },
      {
        key: 'quality',
        icon: <CheckCircleOutlined />,
        label: 'Quality Management',
        children: [
          { key: '/dashboard/quality', icon: <DashboardOutlined />, label: 'Executive Dashboard' },
          { key: '/dashboard/quality/enhanced', icon: <LineChartOutlined />, label: 'Analytics & KPIs' },
          { key: '/dashboard/quality/inspections', icon: <ExperimentOutlined />, label: 'Quality Inspections' },
          { key: '/dashboard/quality/suppliers', icon: <TeamOutlined />, label: 'Supplier Quality' },
          { key: '/dashboard/quality/defects', icon: <BugOutlined />, label: 'Defect Management' },
          { key: '/dashboard/quality/templates', icon: <FileTextOutlined />, label: 'Quality Templates' },
          { key: '/dashboard/quality/standards', icon: <TrophyOutlined />, label: 'Quality Standards' },
        ]
      }
    );

    return baseMenuItems;
  }

  // User-level access (clientuser, epcuser, contractoruser)
  if (['clientuser', 'epcuser', 'contractoruser'].includes(django_user_type ?? '')) {
    return [
      { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
      { key: '/dashboard/voice-translator', icon: <SoundOutlined />, label: 'Voice Translator' },
      {
        key: 'training',
        icon: <AuditOutlined />,
        label: 'Training',
        children: [
          { key: '/dashboard/inductiontraining', icon: <ReadOutlined />, label: 'Induction Training' },
          { key: '/dashboard/jobtraining', icon: <ReadOutlined />, label: 'Job Training' },
        ]
      },
      {
        key: 'safetyobservation',
        icon: <SafetyOutlined />,
        label: 'Safety Observation',
        children: [
          { key: '/dashboard/safetyobservation/form', icon: <FormOutlined />, label: 'Observation Form' },
          { key: '/dashboard/safetyobservation/list', icon: <TeamOutlined />, label: 'Observation List' },
        ]
      },
      {
        key: 'ptw',
        icon: <FormOutlined />,
        label: 'Permits to Work',
        children: [
          { key: '/dashboard/ptw', icon: <FileTextOutlined />, label: 'All Permits' },
          { key: '/dashboard/ptw/create', icon: <PlusOutlined />, label: 'Create Permit' },
          { key: '/dashboard/ptw/pending-approvals', icon: <ClockCircleOutlined />, label: 'Pending Approvals' },
          { key: '/dashboard/ptw/dashboard', icon: <BarChartOutlined />, label: 'Dashboard' }
        ]
      },
      {
        key: 'inspection',
        icon: <ExperimentOutlined />,
        label: 'Inspections',
        children: [
          { key: '/dashboard/inspection', icon: <FileTextOutlined />, label: 'All Inspections' },
          { key: '/dashboard/inspection/create', icon: <PlusOutlined />, label: 'Create Inspection' },
          { key: '/dashboard/inspection/reports', icon: <BarChartOutlined />, label: 'Reports' }
        ]
      },
      {
        key: 'esg',
        icon: <EnvironmentOutlined />,
        label: 'ESG Management',
        children: [
          { key: '/dashboard/esg', icon: <DashboardOutlined />, label: 'ESG Overview' },
          {
            key: 'environment',
            icon: <EnvironmentOutlined />,
            label: 'Environmental Management',
            children: [
              { key: '/dashboard/esg/environment?tab=aspects', icon: <EnvironmentOutlined />, label: 'Environment Aspects' },
              { key: '/dashboard/esg/environment?tab=generation', icon: <ThunderboltOutlined />, label: 'Generation Data' },
              { key: '/dashboard/esg/environment?tab=waste', icon: <DeleteOutlined />, label: 'Waste Management' },
              { key: '/dashboard/esg/environment?tab=biodiversity', icon: <BugOutlined />, label: 'Biodiversity Events' },
              { key: '/dashboard/esg/monitoring', icon: <ExperimentOutlined />, label: 'Environmental Monitoring' },
              { key: '/dashboard/esg/sustainability-targets', icon: <TrophyOutlined />, label: 'Sustainability Targets' },
            ]
          },
          { key: '/dashboard/esg/governance', icon: <AuditOutlined />, label: 'Governance' },
          { key: '/dashboard/esg/reports', icon: <BarChartOutlined />, label: 'ESG Reports' },
        ]
      },
      {
        key: 'quality',
        icon: <CheckCircleOutlined />,
        label: 'Quality Management',
        children: [
          { key: '/dashboard/quality', icon: <DashboardOutlined />, label: 'Executive Dashboard' },
          { key: '/dashboard/quality/enhanced', icon: <LineChartOutlined />, label: 'Analytics & KPIs' },
          { key: '/dashboard/quality/inspections', icon: <ExperimentOutlined />, label: 'Quality Inspections' },
          { key: '/dashboard/quality/suppliers', icon: <TeamOutlined />, label: 'Supplier Quality' },
          { key: '/dashboard/quality/defects', icon: <BugOutlined />, label: 'Defect Management' },
          { key: '/dashboard/quality/templates', icon: <FileTextOutlined />, label: 'Quality Templates' },
          { key: '/dashboard/quality/standards', icon: <TrophyOutlined />, label: 'Quality Standards' },
        ]
      },
    ];
  }

  // Default fallback menu
  return [
    { key: '/dashboard', icon: <DashboardOutlined />, label: 'Overview' },
    { key: '/dashboard/profile', icon: <UserOutlined />, label: 'Profile' },
  ];
};

/**
 * Get menu configuration for specific user
 */
export const getMenuConfig = (usertype?: string, django_user_type?: string): MenuConfig => {
  return {
    userType: usertype || 'unknown',
    djangoUserType: django_user_type,
    menuItems: getMenuItemsForUser(usertype, django_user_type)
  };
};

export default {
  getMenuItemsForUser,
  getMenuConfig
};
