export const TypeAid = ["SUPPORT_AID","IN_LIEU_AID","ACTING_AS_AID"] as const

export type TypeAid = typeof TypeAid[number]

export const TypeAidDirection = ["GIVEN","RECEIVED"] as const

export type TypeAidDirection = typeof TypeAidDirection[number]

export const TypeAidNonfd = ["LAW_ENFORCEMENT","SOCIAL_SERVICES","ANIMAL_SERVICES","HOUSING_SERVICES","UTILITIES_PUBLIC_WORKS","REMEDIATION_SERVICES"] as const

export type TypeAidNonfd = typeof TypeAidNonfd[number]

export const TypeAlarmFailure = ["EXPIRED","NO_BATTERY","IMPROPER_INSTALLATION","DEVICE_MALFUNCTION","TAMPER","OTHER_NON_FUNCTIONAL_CAUSE","UNABLE_TO_DETERMINE"] as const

export type TypeAlarmFailure = typeof TypeAlarmFailure[number]

export const TypeAlarmFire = ["MANUAL","AUTOMATIC","MANUAL_AND_AUTOMATIC"] as const

export type TypeAlarmFire = typeof TypeAlarmFire[number]

export const TypeAlarmOperation = ["OPERATED_ALERTED_OCCUPANT","OPERATED_FAILED_TO_ALERT_OCCUPANT","NO_OCCUPANT_TO_NOTIFY","FAILED_TO_OPERATE","INSUFFICIENT_SOURCE"] as const

export type TypeAlarmOperation = typeof TypeAlarmOperation[number]

export const TypeAlarmOther = ["CARBON_MONOXIDE","NATURAL_GAS","HEAT_DETECTOR","OTHER_CHEMICAL_DETECTOR"] as const

export type TypeAlarmOther = typeof TypeAlarmOther[number]

export const TypeAlarmSmoke = ["LONG_LIFE_BATTERY_POWERED","REPLACEABLE_BATTERY_POWERED","HARDWIRED","INTERCONNECTED","HARD_OF_HEARING_WITH_STROBE","BED_SHAKER","COMBINATION","UNKNOWN"] as const

export type TypeAlarmSmoke = typeof TypeAlarmSmoke[number]

export const TypeCasualty = ["UNINJURED","INJURED_NONFATAL","INJURED_FATAL"] as const

export type TypeCasualty = typeof TypeCasualty[number]

export const TypeCasualtyAction = ["SEARCH_RESCUE","CARRYING_SETTINGUP_EQUIPMENT","ADVANCING_OPERATING_HOSELINE","VEHICLE_EXTRICATION","VENTILATION","FORCIBLE_ENTRY","PUMP_OPERATIONS","EMS_PATIENT_CARE","DURING_INCIDENT_RESPONSE","SCENE_SAFETY_DIRECTING_TRAFFIC","STANDBY","INCIDENT_COMMAND","OTHER"] as const

export type TypeCasualtyAction = typeof TypeCasualtyAction[number]

export const TypeCasualtyCause = ["CAUGHT_TRAPPED_BY_FIRE_EXPLOSION","FALL_JUMP","STRESS_OVEREXERTION","COLLAPSE","CAUGHT_TRAPPED_BY_OBJECT","STRUCK_CONTACT_WITH_OBJECT","EXPOSURE","VEHICLE_COLLISION","OTHER"] as const

export type TypeCasualtyCause = typeof TypeCasualtyCause[number]

export const TypeCasualtyPpe = ["TURNOUT_COAT","BUNKER_PANTS","PROTECTIVE_HOOD","GLOVES","FACE_SHIELD_GOGGLES","HELMET","SCBA","PASS_DEVICE","RUBBER_KNEE_BOOTS","3_4_BOOTS","BRUSH_GEAR","REFLECTIVE_VEST","OTHER_SPECIAL_EQUIPMENT"] as const

export type TypeCasualtyPpe = typeof TypeCasualtyPpe[number]

export const TypeCasualtyTimeline = ["RESPONDING","INITIAL_RESPONSE","CONTINUING_OPERATIONS","EXTENDED_OPERATIONS","AFTER_CONCLUSION_OF_INCIDENT","UNKNOWN"] as const

export type TypeCasualtyTimeline = typeof TypeCasualtyTimeline[number]

export const TypeDept = ["CAREER","VOLUNTEER","COMBINATION"] as const

export type TypeDept = typeof TypeDept[number]

export const TypeDisplaceCause = ["FIRE","SMOKE","WATER","UTILITIES","HAZARDOUS_SITUATION","COLLAPSE","OTHER"] as const

export type TypeDisplaceCause = typeof TypeDisplaceCause[number]

export const TypeDispProtoFire = ["PROQA","IAED","APCO","OTHER"] as const

export type TypeDispProtoFire = typeof TypeDispProtoFire[number]

export const TypeDispProtoMed = ["PROQA","IAED","APCO","OTHER"] as const

export type TypeDispProtoMed = typeof TypeDispProtoMed[number]

export const TypeDuty = ["RESPONDING_TO_EMERGENCY_INCIDENT","WORKING_AT_SCENE_OF_FIRE_INCIDENT","WORKING_AT_SCENE_OF_NONFIRE_INCIDENT","RETURNING_FROM_EMERGENCY_INCIDENT","TRAINING","AFTER_INCIDENT","OTHER_ON_DUTY_INCIDENT"] as const

export type TypeDuty = typeof TypeDuty[number]

export const TypeEmerghazPowergen = ["PHOTOVOLTAICS","WIND_TURBINE","OTHER","NOT_APPLICABLE"] as const

export type TypeEmerghazPowergen = typeof TypeEmerghazPowergen[number]

export const TypeEmerghazPv = ["PANEL_WATER_HEATING","PANEL_POWER_GENERATION","TILE_POWER_GENERATION","THIN_FILM_POWER_GENERATION","OTHER"] as const

export type TypeEmerghazPv = typeof TypeEmerghazPv[number]

export const TypeEmerghazPvIgn = ["SOURCE","TARGET"] as const

export type TypeEmerghazPvIgn = typeof TypeEmerghazPvIgn[number]

export const TypeEmerghazSuppression = ["RUN_COURSE","SUPPRESSION_WATER_ONLY","SUPPRESSION_WATER_ADDITIVE","SUBMERGE_BURY","FIRE_BLANKET","BATTERY_PENETRATION"] as const

export type TypeEmerghazSuppression = typeof TypeEmerghazSuppression[number]

export const TypeEntity = ["LOCAL","CONTRACT","FEDERAL","STATE","OTHER","PRIVATE","TRANSPORTATION","TRIBAL"] as const

export type TypeEntity = typeof TypeEntity[number]

export const TypeExposureDamage = ["NO_DAMAGE","MINOR_DAMAGE","MODERATE_DAMAGE","MAJOR_DAMAGE"] as const

export type TypeExposureDamage = typeof TypeExposureDamage[number]

export const TypeExposureItem = ["STRUCTURE","VEHICLE","OUTDOOR_ENVIRONMENT","OBJECT_OTHER"] as const

export type TypeExposureItem = typeof TypeExposureItem[number]

export const TypeExposureLoc = ["EXTERNAL_EXPOSURE","INTERNAL_EXPOSURE"] as const

export type TypeExposureLoc = typeof TypeExposureLoc[number]

export const TypeFfNonff = ["FF","NONFF"] as const

export type TypeFfNonff = typeof TypeFfNonff[number]

export const TypeFireBldgDamage = ["NO_DAMAGE","MINOR_DAMAGE","MODERATE_DAMAGE","MAJOR_DAMAGE"] as const

export type TypeFireBldgDamage = typeof TypeFireBldgDamage[number]

export const TypeFireCauseIn = ["OPERATING_EQUIPMENT","ELECTRICAL","BATTERY_POWER_STORAGE","HEAT_FROM_ANOTHER_OBJECT","EXPLOSIVES_FIREWORKS","SMOKING_MATERIALS_ILLICIT_DRUGS","OPEN_FLAME","COOKING","CHEMICAL","ACT_OF_NATURE","INCENDIARY","OTHER_HEAT_SOURCE","UNABLE_TO_BE_DETERMINED"] as const

export type TypeFireCauseIn = typeof TypeFireCauseIn[number]

export const TypeFireCauseOut = ["NATURAL","EQUIPMENT_VEHICLE_USE","SMOKING_MATERIALS_ILLICIT_DRUGS","RECREATION_CEREMONY","DEBRIS_OPEN_BURNING","RAILROAD_OPS_MAINTENANCE","FIREARMS_EXPLOSIVES","FIREWORKS","POWER_GEN_TRANS_DIST","STRUCTURE","INCENDIARY","BATTERY_POWER_STORAGE","SPREAD_FROM_CONTROLLED_BURN","UNABLE_TO_BE_DETERMINED"] as const

export type TypeFireCauseOut = typeof TypeFireCauseOut[number]

export const TypeFireConditionArrival = ["NO_SMOKE_FIRE_SHOWING","SMOKE_SHOWING","SMOKE_FIRE_SHOWING","STRUCTURE_INVOLVED","FIRE_SPREAD_BEYOND_STRUCTURE","FIRE_OUT_UPON_ARRIVAL"] as const

export type TypeFireConditionArrival = typeof TypeFireConditionArrival[number]

export const TypeFireInvest = ["INVESTIGATED_ON_SCENE_RESOURCE","INVESTIGATED_BY_ARSON_FIRE_INVESTIGATOR","INVESTIGATED_BY_OUTSIDE_AGENCY","INVESTIGATED_BY_STATE_FIRE_MARSHAL","INVESTIGATED_BY_INSURANCE","INVESTIGATED_BY_NONFIRE_LAW_ENFORCEMENT","INVESTIGATED_BY_OTHER"] as const

export type TypeFireInvest = typeof TypeFireInvest[number]

export const TypeFireInvestNeed = ["YES","NO","NOT_EVALUATED","NOT_APPLICABLE","NO_CAUSE_OBVIOUS","OTHER"] as const

export type TypeFireInvestNeed = typeof TypeFireInvestNeed[number]

export const TypeFullPartial = ["FULL","PARTIAL","EXTENT_UNKNOWN"] as const

export type TypeFullPartial = typeof TypeFullPartial[number]

export const TypeGender = ["MALE","FEMALE","TRANSGENDER_MALE_FEMALE_TO_MALE","TRANSGENDER_FEMALE_MALE_TO_FEMALE","OTHER_GENDER_IDENTITY","UNKNOWN"] as const

export type TypeGender = typeof TypeGender[number]

export const TypeHazardCause = ["INTENTIONAL","UNINTENTIONAL","CONTAINER_CONTAINMENT_FAILURE","ACT_OF_NATURE","CAUSE_UNDER_INVESTIGATION"] as const

export type TypeHazardCause = typeof TypeHazardCause[number]

export const TypeHazardDisposition = ["COMPLETED_FIRE_SERVICE_ONLY","COMPLETED_WITH_FIRE_SERVICE_PRESENT","RELEASED_TO_LOCAL_AGENCY","RELEASED_TO_COUNTY_AGENCY","RELEASED_TO_STATE_AGENCY","RELEASED_TO_FEDERAL_AGENCY","RELEASED_TO_PRIVATE_AGENCY","RELEASED_TO_PROPERTY_OWNER"] as const

export type TypeHazardDisposition = typeof TypeHazardDisposition[number]

export const TypeHazardDot = ["EXPLOSIVES","GASES","FLAMMABLE_LIQUIDS","FLAMMABLE_SOLIDS","OXIDIZERS","POISONS_AND_ETIOLOGIC_MATERIALS","RADIOACTIVE_MATERIALS","CORROSIVES","MISCELLANEOUS_DANGEROUS_SUBSTANCES"] as const

export type TypeHazardDot = typeof TypeHazardDot[number]

export const TypeHazardPhysicalState = ["SOLID","LIQUID","GAS","RADIOACTIVE","UNKNOWN"] as const

export type TypeHazardPhysicalState = typeof TypeHazardPhysicalState[number]

export const TypeHazardReleasedInto = ["AIR","WATER","GROUND"] as const

export type TypeHazardReleasedInto = typeof TypeHazardReleasedInto[number]

export const TypeJobClassification = ["CAREER","PART_TIME","PAID_ON_CALL","INDUSTRIAL","VOLUNTEER","WILDLAND_FULL_TIME","WILDLAND_PART_TIME","WILDLAND_CONTRACT"] as const

export type TypeJobClassification = typeof TypeJobClassification[number]

export const TypeLocationCrossStreet = ["CLOSEST","SECOND_CLOSEST"] as const

export type TypeLocationCrossStreet = typeof TypeLocationCrossStreet[number]

export const TypeLocSnDirection = ["NORTHBOUND","SOUTHBOUND","EASTBOUND","WESTBOUND"] as const

export type TypeLocSnDirection = typeof TypeLocSnDirection[number]

export const TypeLocSnPreSep = ["OF_THE","AT","DE","DE_LA","DEL","DE_LAS","DES","IN_THE","TO_THE","OF","ON_THE","TO"] as const

export type TypeLocSnPreSep = typeof TypeLocSnPreSep[number]

export const TypeMedicalPatientCare = ["PATIENT_EVALUATED_CARE_PROVIDED","PATIENT_EVALUATED_REFUSED_CARE","PATIENT_EVALUATED_NO_CARE_REQUIRED","PATIENT_REFUSED_EVALUATION_CARE","PATIENT_SUPPORT_SERVICES_PROVIDED","PATIENT_DEAD_ON_ARRIVAL"] as const

export type TypeMedicalPatientCare = typeof TypeMedicalPatientCare[number]

export const TypeMedicalPatientStatus = ["IMPROVED","UNCHANGED","WORSE"] as const

export type TypeMedicalPatientStatus = typeof TypeMedicalPatientStatus[number]

export const TypeMedicalTransport = ["TRANSPORT_BY_EMS_UNIT","OTHER_AGENCY_TRANSPORT","PATIENT_REFUSED_TRANSPORT","NONPATIENT_TRANSPORT","NO_TRANSPORT"] as const

export type TypeMedicalTransport = typeof TypeMedicalTransport[number]

export const TypeNoaction = ["CANCELLED","STAGED_STANDBY","NO_INCIDENT_FOUND"] as const

export type TypeNoaction = typeof TypeNoaction[number]

export const TypeOccupantResponse = ["EVACUATED","IGNORED_ALARM","UNABLE_TO_RESPOND","ATTEMPTED_TO_EXTINGUISH","ATTEMPTED_TO_RESCUE_OCCUPANTS","ATTEMPTED_TO_RESCUE_ANIMALS","UNKNOWN"] as const

export type TypeOccupantResponse = typeof TypeOccupantResponse[number]

export const TypePopSource = ["DEPARTMENT_ENTERED","CENSUS_DERIVED"] as const

export type TypePopSource = typeof TypePopSource[number]

export const TypePsap = ["PRIMARY","SECONDARY"] as const

export type TypePsap = typeof TypePsap[number]

export const TypePsapCapa = ["LEGACY","NG911"] as const

export type TypePsapCapa = typeof TypePsapCapa[number]

export const TypePsapDisc = ["SINGLE","MULTIPLE"] as const

export type TypePsapDisc = typeof TypePsapDisc[number]

export const TypePsapJuris = ["SINGLE","MULTIPLE"] as const

export type TypePsapJuris = typeof TypePsapJuris[number]

export const TypeRace = ["AMERICAN_INDIAN_ALASKA_NATIVE","ASIAN","BLACK_AFRICAN_AMERICAN","MIDDLE_EASTERN_NORTH_AFRICAN","HISPANIC_LATINO","NATIVE_HAWAIIAN_PACIFIC_ISLANDER","WHITE","OTHER","UNKNOWN"] as const

export type TypeRace = typeof TypeRace[number]

export const TypeRegion = ["JURISDICTION","BATTALION","COUNCIL_DISTRICT","DISTRICT","DIVISION","FIRST_DUE","OTHER"] as const

export type TypeRegion = typeof TypeRegion[number]

export const TypeRelDeptDept = ["IS_CHILD_OF","IS_PARENT_OF","MUTUALLY_AIDS","IS_MUTUALLY_AIDED_BY","AUTOMATICALLY_AIDS","IS_AUTOMATICALLY_AIDED_BY","CONTRACTUALLY_AIDS","IS_CONTRACTUALLY_AIDED_BY"] as const

export type TypeRelDeptDept = typeof TypeRelDeptDept[number]

export const TypeRelDeptStation = ["INCLUDES"] as const

export type TypeRelDeptStation = typeof TypeRelDeptStation[number]

export const TypeRelEventIncident = ["CAUSED_BY","CAUSED","INCLUDES"] as const

export type TypeRelEventIncident = typeof TypeRelEventIncident[number]

export const TypeRelIncidentIncident = ["DUPLICATED_BY"] as const

export type TypeRelIncidentIncident = typeof TypeRelIncidentIncident[number]

export const TypeRelStationStation = ["UNKNOWN"] as const

export type TypeRelStationStation = typeof TypeRelStationStation[number]

export const TypeRelUnitUnit = ["UNKNOWN"] as const

export type TypeRelUnitUnit = typeof TypeRelUnitUnit[number]

export const TypeRescue = ["RESCUED_BY_FIREFIGHTER","RESCUED_BY_FF_RIT","RESCUED_BY_NONFIREFIGHTER","EVAC_ASSISTED_BY_FIREFIGHTER","SELF_EVACUATION","NO_RESCUE_NEEDED"] as const

export type TypeRescue = typeof TypeRescue[number]

export const TypeRescueAction = ["VENTILATION","HYDRAULIC_TOOL_USE","UNDERWATER_DIVE","ROPE_RIGGING","BREAK_BREACH_WALL","BRACE_WALL_INFRASTRUCTURE","TRENCH_SHORING","SUPPLY_AIR"] as const

export type TypeRescueAction = typeof TypeRescueAction[number]

export const TypeRescueElevation = ["ON_FLOOR","ON_BED","ON_FURNITURE","OTHER"] as const

export type TypeRescueElevation = typeof TypeRescueElevation[number]

export const TypeRescueImpediment = ["HOARDING_CONDITIONS","ACCESS_LIMITATIONS","PHYSICAL_MEDICAL_CONDITIONS_PERSON","IMPAIRED_PERSON","OTHER","NONE"] as const

export type TypeRescueImpediment = typeof TypeRescueImpediment[number]

export const TypeRescueMode = ["REMOVAL_FROM_STRUCTURE","EXTRICATION","DISENTANGLEMENT","RECOVERY","OTHER"] as const

export type TypeRescueMode = typeof TypeRescueMode[number]

export const TypeRescuePath = ["REMOVAL_ALONG_PRIMARY_PATH","REMOVAL_ALONG_ALT_PATH"] as const

export type TypeRescuePath = typeof TypeRescuePath[number]

export const TypeRescuePresenceKnown = ["KNOWN_DISPATCH","KNOWN_ARRIVAL","KNOWN_DURING"] as const

export type TypeRescuePresenceKnown = typeof TypeRescuePresenceKnown[number]

export const TypeResponseMode = ["EMERGENT","NON_EMERGENT"] as const

export type TypeResponseMode = typeof TypeResponseMode[number]

export const TypeRoom = ["ASSEMBLY","BATHROOM","BEDROOM","KITCHEN","LIVING_SPACE","HALLWAY_FOYER","GARAGE","BALCONY_PORCH_DECK","BASEMENT","ATTIC","OFFICE","UTILITY_ROOM","OTHER","UNKNOWN"] as const

export type TypeRoom = typeof TypeRoom[number]

export const TypeRrPresence = ["PRESENT","NOT_PRESENT","NOT_APPLICABLE"] as const

export type TypeRrPresence = typeof TypeRrPresence[number]

export const TypeServEms = ["NO_MEDICAL","BLS_NO_TRANSPORT","ALS_NO_TRANSPORT","BLS_TRANSPORT","ALS_TRANSPORT","AERO_TRANSPORT","COMMUNITY_MED"] as const

export type TypeServEms = typeof TypeServEms[number]

export const TypeServInvest = ["COMPANY_LEVEL","YOUTH_FIRESETTER","DEDICATED","LAW_ENFORCEMENT","K9_DETECT"] as const

export type TypeServInvest = typeof TypeServInvest[number]

export const TypeSourceTarget = ["SOURCE","TARGET","UNKNOWN"] as const

export type TypeSourceTarget = typeof TypeSourceTarget[number]

export const TypeSpecialModifier = ["ACTIVE_ASSAILANT","MCI","FEDERAL_DECLARED_DISASTER","STATE_DECLARED_DISASTER","COUNTY_LOCAL_DECLARED_DISASTER","URBAN_CONFLAGRATION","VIOLENCE_AGAINST_RESPONDER"] as const

export type TypeSpecialModifier = typeof TypeSpecialModifier[number]

export const TypeSuppressAppliance = ["FIRE_EXTINGUISHER","BOOSTER_FIRE_HOSE","SMALL_DIAMETER_FIRE_HOSE","MEDIUM_DIAMETER_FIRE_HOSE","GROUND_MONITOR","MASTER_STREAM","ELEVATED_MASTER_STREAM_STANDPIPE","BUILDING_STANDPIPE","BUILDING_FDC","AIRATTACK_HELITACK","OTHER","NONE"] as const

export type TypeSuppressAppliance = typeof TypeSuppressAppliance[number]

export const TypeSuppressCooking = ["COMMERCIAL_HOOD_SUPPRESSION","RESIDENTIAL_HOOD_MOUNTED","TEMPERATURE_LIMITING_STOVE","ELECTRIC_POWER_CUTOFF_DEVICE","OTHER"] as const

export type TypeSuppressCooking = typeof TypeSuppressCooking[number]

export const TypeSuppressFire = ["WET_PIPE_SPRINKLER_SYSTEM","DRY_PIPE_SPRINKLER_SYSTEM","PRE_ACTION_SYSTEM","DELUGE_SYSTEM","CLEAN_AGENT_SYSTEM","INDUSTRIAL_DRY_CHEM_SYSTEM","OTHER","UNKNOWN"] as const

export type TypeSuppressFire = typeof TypeSuppressFire[number]

export const TypeSuppressNoOperation = ["SYSTEM_SHUTOFF_PRIOR_TO_INCIDENT","SYSTEM_SHUTOFF_DURING_INCIDENT","SYSTEM_INOPERABLE","SYSTEM_DAMAGED_COMPROMISED","SYSTEM_NOT_SUITABLE","INSUFFICIENT_WATER_SUPPLY","INSUFFICIENT_SOURCE","UNABLE_TO_DETERMINE"] as const

export type TypeSuppressNoOperation = typeof TypeSuppressNoOperation[number]

export const TypeSuppressOperation = ["OPERATED_EFFECTIVE","OPERATED_NOT_EFFECTIVE","NO_OPERATION"] as const

export type TypeSuppressOperation = typeof TypeSuppressOperation[number]

export const TypeSuppressTime = ["PRE_SUPPRESSION","DURING_SUPPRESSION","POST_SUPPRESSION"] as const

export type TypeSuppressTime = typeof TypeSuppressTime[number]

export const TypeVacancy = ["NEW_CONSTRUCTION_REMODEL","ABANDONED","FOR_SALE_LEASE","FORECLOSURE","DAMAGE_DECAY","SEASONAL_OCCASIONALLY_OCCUPIED","UNKNOWN"] as const

export type TypeVacancy = typeof TypeVacancy[number]

export const TypeWaterSupply = ["HYDRANT_LESS_500","HYDRANT_GREATER_500","TANK_WATER","WATER_TENDER_SHUTTLE","NURSE_OTHER_APPARATUS","DRAFT_FROM_STATIC_SOURCE","SUPPLY_FROM_FIRE_BOAT","FOAM_ADDITIVE"] as const

export type TypeWaterSupply = typeof TypeWaterSupply[number]

export const TypeYesNoUnknown = ["YES","NO","UNKNOWN"] as const

export type TypeYesNoUnknown = typeof TypeYesNoUnknown[number]

export const TypeActivity = ["DRIVING_RIDING_DEPARTMENT_VEHICLE","DRIVING_RIDING_OTHER_VEHICLE","MOVING_ABOUT_STATION_ALARM","MOVING_ABOUT_STATION_NORMAL","STATION_MAINTENANCE","VEHICLE_MAINTENANCE","EQUIPMENT_MAINTENANCE","PHYSICAL_FITNESS_ACTIVITY","COOKING_ACTIVITY","TRAINING_ACTIVITY_DRILL","INVESTIGATION","INSPECTION","ADMINISTRATIVE_WORK","COMMUNICATIONS_WORK","AT_REST","OTHER"] as const

export type TypeActivity = typeof TypeActivity[number]

export const TypeAlcoholTobaccoDrugs = ["ALCOHOL_USER","TOBACCO_USER","SMOKER_OTHER","MARIJUANA_USER","OTHER_ILLICIT_DRUGS","NONE"] as const

export type TypeAlcoholTobaccoDrugs = typeof TypeAlcoholTobaccoDrugs[number]

export const TypeAspect = ["NORTH_WEST","SOUTH_WEST","NORTH","SOUTH","EAST","WEST","NORTH_EAST","SOUTH_EAST"] as const

export type TypeAspect = typeof TypeAspect[number]

export const TypeAssignment = ["FIRE_SUPPRESSION","HAZMAT","RESCUE","EMS","PREVENTION_INSPECTION","TRAINING","MAINTENANCE","COMMUNICATIONS","ADMINISTRATION","FIRE_INVESTIGATIONS","MIH_PARAMEDICINE","OTHER"] as const

export type TypeAssignment = typeof TypeAssignment[number]

export const TypeAttached = ["FENCE","PORCH_DECK","CARPORT_LEANTO","PATIO_COVER_AWNING","GARAGE","OTHER","NONE"] as const

export type TypeAttached = typeof TypeAttached[number]

export const TypeAttachedMaterial = ["COMBUSTIBLE","NON COMBUSTIBLE","NONE PRESENT","UNKNOWN"] as const

export type TypeAttachedMaterial = typeof TypeAttachedMaterial[number]

export const TypeAutoBodyStyle = ["AMBULANCE","BUS","CONVERTIBLE","COUPE","FIRE TRUCK","HARDTOP","HATCHBACK","HEARSE","LIMOUSINE","MINIVAN","MOTORIZED_HOME","PICKUP","ROADSTER","SUV","SEDAN","STATION_WAGON","VAN"] as const

export type TypeAutoBodyStyle = typeof TypeAutoBodyStyle[number]

export const TypeBatteryCell = ["POUCH_POLYMER","CYLINDRICAL","PRISMATIC","BUTTON_COIN"] as const

export type TypeBatteryCell = typeof TypeBatteryCell[number]

export const TypeBatteryChemistry = ["LITHIUM_ION","LITHIUM_METAL","LITHIUM_IRON_PHOSPHATE","LITHIUM_SULPHUR","SODIUM_ION","ALKALINE","LEAD_ACID","NICKEL_METAL_HYDRIDE","UNKNOWN","OTHER"] as const

export type TypeBatteryChemistry = typeof TypeBatteryChemistry[number]

export const TypeBldgDamage = ["MINOR_DAMAGE","MODERATE_DAMAGE","DESTROYED","INACCESSIBLE","NO DAMAGE"] as const

export type TypeBldgDamage = typeof TypeBldgDamage[number]

export const TypeConstruction = ["TYPE_IA","TYPE_IB","TYPE_IIA","TYPE_IIB","TYPE_IIIA","TYPE_IIIB","TYPE_IV","TYPE_VA","TYPE_VB","UNKNOWN"] as const

export type TypeConstruction = typeof TypeConstruction[number]

export const TypeContributingHazards = ["CIRCUITS_TRIPPED","GAS_FUEL_ON","CO_DETECTED","OTHER"] as const

export type TypeContributingHazards = typeof TypeContributingHazards[number]

export const TypeDeckPorchGrade = ["ON GRADE","ELEVATED","NONE PRESENT","BELOW_GRADE_SUNKEN"] as const

export type TypeDeckPorchGrade = typeof TypeDeckPorchGrade[number]

export const TypeDeckPorchMaterial = ["COMPOSITE","MASONRY/CONCRETE","WOOD","VINYL_PLASTIC_PVC","METAL","OTHER","UNKNOWN"] as const

export type TypeDeckPorchMaterial = typeof TypeDeckPorchMaterial[number]

export const TypeDinsOriginCause = ["DIRECT FLAME IMPINGEMENT","EMBERS","RADIANT HEAT","UNKNOWN","OTHER"] as const

export type TypeDinsOriginCause = typeof TypeDinsOriginCause[number]

export const TypeDinsOriginLocation = ["ATTACHED FENCE","ATTACHED PATIO COVER/CARPORT","DECK ELEVATED","DECK ON GRADE","EAVES","ROOF","SIDING","WINDOW","VENT","UNKNOWN","OTHER"] as const

export type TypeDinsOriginLocation = typeof TypeDinsOriginLocation[number]

export const TypeDisposition = ["FIRST_AID_ONLY","HOSPITAL","DOCTORS_OFFICE","MORGUE_FUNERAL_HOME","RESIDENCE","NO_CARE_NEEDED"] as const

export type TypeDisposition = typeof TypeDisposition[number]

export const TypeDistanceUnit = ["FEET","MILES"] as const

export type TypeDistanceUnit = typeof TypeDistanceUnit[number]

export const TypeEaves = ["ENCLOSED","UNENCLOSED","NO EAVES","UNKNOWN"] as const

export type TypeEaves = typeof TypeEaves[number]

export const TypeExposure = ["SMOKE","DERMAL","INFECTIOUS_DISEASE","HEAT","HAZMAT","OTHER"] as const

export type TypeExposure = typeof TypeExposure[number]

export const TypeExteriorFinish = ["WOOD","BRICK_STONE","VINYL","ASHPHALT","METAL","CONCRETE","EIFS","STUCCO","FIBER_CEMENT"] as const

export type TypeExteriorFinish = typeof TypeExteriorFinish[number]

export const TypeFireSpread = ["OBJECT","ROOM","FLOOR","BUILDING","BEYOND_BUILDING"] as const

export type TypeFireSpread = typeof TypeFireSpread[number]

export const TypeFoundation = ["CRAWL_SPACE","POURED_CONCRETE_SLAB","FULL_BASEMENT","SLAB_ON_GRADE","INSULATED_CONCRETE","PIER_AND_BEAM_PILE","CONCRETE_PANELS","WOOD","STONE"] as const

export type TypeFoundation = typeof TypeFoundation[number]

export const TypeFuelArrangement = ["GROUND_FUELS","SURFACE_FUELS","CROWN_FUELS"] as const

export type TypeFuelArrangement = typeof TypeFuelArrangement[number]

export const TypeFuelDistribution = ["CONTINUOUS_HORIZONTAL","LADDER_VERTICAL"] as const

export type TypeFuelDistribution = typeof TypeFuelDistribution[number]

export const TypeFuelSize = ["LESS_THAN_0.25","0.25_TO_1","1_TO_3","3_TO_8","GREATER_THAN_8"] as const

export type TypeFuelSize = typeof TypeFuelSize[number]

export const TypeGeneralFireCause = ["NATURAL","ACCIDENTAL","INCENDIARY","UNDETERMINED"] as const

export type TypeGeneralFireCause = typeof TypeGeneralFireCause[number]

export const TypeHazsitDisposition = ["COMPLETED_FIRE_SERVICE_ONLY","COMPLETED_WITH_FIRE_SERVICE_PRESENT","RELEASED_TO_LOCAL_AGENCY","RELEASED_TO_COUNTY_AGENCY","RELEASED_TO_STATE_AGENCY","RELEASED_TO_FEDERAL_AGENCY","RELEASED_TO_PRIVATE_AGENCY","RELEASED_TO_PROPERTY_OWNER","NO_ACTION_NECESSARY"] as const

export type TypeHazsitDisposition = typeof TypeHazsitDisposition[number]

export const TypeHazsitType = ["SPILL","LEAK","FIRE","EXPLOSION","MATERIAL_ENTERED_WATERWAY","SOLID_DISPERSION","VAPOR_GAS_DISPERSION","ENVIRONMENTAL_DAMAGE","NO_RELEASE"] as const

export type TypeHazsitType = typeof TypeHazsitType[number]

export const TypeHealthProblems = ["HEART_FAILURE","COPD","ASTHMA","CARDIAC_ARRHYTHMIA","HYPERTENSION","KIDNEY_DISEASE","CANCER","CVA_STROKE","MYOCARDIAL_INFARCTION","SEIZURE_DISORDER","DIABETES","POST_SURGERY","OPEN_WOUNDS","PAIN_CONTROL","PSYCHOLOGICAL_BEHAVIORAL_HEALTH","SUBSTANCE_USE_DISORDER","PHYSICAL_LIMITATIONS_DISABILITY","OTHER","NONE"] as const

export type TypeHealthProblems = typeof TypeHealthProblems[number]

export const TypeHumanFactors = ["HOARDING_DISORDER","INTELLECTUAL_DISABILITY","PHYSICAL_DISABILITY","ILLICIT_DRUG_USE","ALCOHOL_USE","ASLEEP","JUVENILE_BEHAVIOR","ELDERLY_AGING","HOMELESSNESS","MEDICAL_CONDITION","MENTAL_HEALTH","CULTURAL_RELIGIOUS_BEHAVIOR","MEDICAL_OXYGEN","NONE","OTHER"] as const

export type TypeHumanFactors = typeof TypeHumanFactors[number]

export const TypeHydrantImpediment = ["OBSTRUCTION","VISUAL_BARRIER","BROKEN_STEM","HARD_OPEN","HARD_CLOSE","LEAKING","CAP_MISSING","CAP_NOT_REMOVABLE","CHATTER","DEFECTIVE_THREAD","DRAIN_DEFECTIVE","FROZEN","NON_FUNCTION_FROST_JACKET","CHAINS_MISSING","NEEDS_PAINT","MARKER_MISSING","NEEDS_GREASE"] as const

export type TypeHydrantImpediment = typeof TypeHydrantImpediment[number]

export const TypeIndoorOutdoor = ["INDOOR","OUTDOOR"] as const

export type TypeIndoorOutdoor = typeof TypeIndoorOutdoor[number]

export const TypeInitialDetection = ["SMOKE_ALARM","HEAT_ALARM","AUTOMATIC_SUPPRESSION","VISUAL_SIGHTING","SPECIALTY_DETECTOR","MANUAL_ACTIVATION","ODOR","PET","AUDIBLE_NOISE","ALERTED_BY_PERSON","NO_INITIAL_DETECTION","UNKNOWN","OTHER"] as const

export type TypeInitialDetection = typeof TypeInitialDetection[number]

export const TypeInjuryCause = ["FALL","JUMP","SLIP_TRIP","EXPOSURE","STRUCK_ASSAULTED_PERSON_ANIMAL_OBJECT","CONTACT_WITH_OBJECT_BY_PERSONNEL","OVEREXERTION_STRAIN","TRAPPED_CAUGHT","VEHICLE_COLLISION_ACCIDENT","STRUCK_BY_VEHICLE","MEDICAL_EVENT","OTHER"] as const

export type TypeInjuryCause = typeof TypeInjuryCause[number]

export const TypeIntersitialSpace = ["DUCT","FLOOR_ASSEMBLY","CRAWL_SPACE","CEILING","ATTIC","OTHER"] as const

export type TypeIntersitialSpace = typeof TypeIntersitialSpace[number]

export const TypeLotUnits = ["SQUARE_FEET","ACRES"] as const

export type TypeLotUnits = typeof TypeLotUnits[number]

export const TypeNfpaRating = ["BLUE","GREEN","ORANGE","RED","BLACK"] as const

export type TypeNfpaRating = typeof TypeNfpaRating[number]

export const TypeOutdoorActivities = ["WEATHER","SUPPRESSION_ACTIVITY","CONSTRUCTION","ELECTRICAL_UTILITIES","FARMING_RANCHING","GOVERNMENTAL_TRIBAL_ACTIVITIES","HUNTING_TRAPPING_FISHING","LAW_ENFORCEMENT","LOGGING_FORESTRY","MILITARY","MINING_EXTRACTION","MOTORIST","OTHER_UTILITIES","PRIVATE_RESIDENTIAL","RAILROAD","RECREATION","TRANSIENT","OTHER","UNKNOWN"] as const

export type TypeOutdoorActivities = typeof TypeOutdoorActivities[number]

export const TypeProductContribution = ["IGNITION","RELEASE","SPREAD"] as const

export type TypeProductContribution = typeof TypeProductContribution[number]

export const TypeRateOfSpread = ["SLOW","MODERATE","DANGEROUS","CRITICAL","UNKNOWN"] as const

export type TypeRateOfSpread = typeof TypeRateOfSpread[number]

export const TypeReasonNotEngaged = ["NO_ONE_HOME","MINOR_HOME_ALONE","OCCUPANT_REFUSED","LANGUAGE_BARRIER","VACANT_HOME","UNSAFE_TO_APPROACH","NO_TRESPASSING_SIGNS","LOCKED_GATE","HOSTILE_PERSON","REFUSED"] as const

export type TypeReasonNotEngaged = typeof TypeReasonNotEngaged[number]

export const TypeReferral = ["ED","OTHER_MEDICAL_PERSONNEL","FD_EMS","SELF","OTHER"] as const

export type TypeReferral = typeof TypeReferral[number]

export const TypeRelativePosition = ["VALLEY_BOTTOM","LOWER_SLOPE","MID_SLOPE","UPPER_SLOPE","RIDGE_TOP","UNKNOWN"] as const

export type TypeRelativePosition = typeof TypeRelativePosition[number]

export const TypeRoofMaterial = ["METAL","ASPHALT_SHINGLES","WOOD_SHINGLES","COMPOSITE_SHINGLES","CLAY_TILES","CONCRETE_TILES","SOLAR_TILES","MEMBRANE","SLATE","OTHER"] as const

export type TypeRoofMaterial = typeof TypeRoofMaterial[number]

export const TypeServicesReferred = ["ADULT_PROTECTIVE_SERVICES","CHILD_PROTECTIVE_SERVICES","OTHER_SOCIAL_SERVICES","HOUSING_SERVICES","ANIMAL_SERVICES","LAW_ENFORCEMENT","UTILITIES","FOOD_SERVICES","MENTAL_HEALTH_SERVICES","PARAMEDICINE","CODE_ENFORCEMENT","YOUTH_FIRE_SETTER_PROGRAM","SUBSTANCE_TREATMENT","MEDICAL_SERVICES","OTHER"] as const

export type TypeServicesReferred = typeof TypeServicesReferred[number]

export const TypeServiceType = ["VOLUNTEER","CAREER","COMBINATION"] as const

export type TypeServiceType = typeof TypeServiceType[number]

export const TypeSeverity = ["MINOR","MODERATE","SEVERE","LIFE_THREATENING","DEATH"] as const

export type TypeSeverity = typeof TypeSeverity[number]

export const TypeShift = ["24_ON_24_OFF","24_ON_48_OFF","24_ON_72_OFF","48_ON_96_OFF","72_ON_96_OFF","10_ON_14_OFF","9_ON_15_OFF","12_ON_12_OFF","8_HRS_5_DAYS","10_HRS_4_DAYS","OTHER"] as const

export type TypeShift = typeof TypeShift[number]

export const TypeTargetAudience = ["PARENTS","K_12","COLLEGE_STUDENTS","65_OVER","HOME_OWNERS","HOME_RENTERS","GENERAL_PUBLIC","OTHER"] as const

export type TypeTargetAudience = typeof TypeTargetAudience[number]

export const TypeTraumaticEvent = ["ACTIVE SHOOTER","NON-FIREFIGHTER FATALITY","FIREFIGHTER FATALITY","FIREFIGHTER NON-FATAL INJURY","FIREFIGHTER NEAR MISS","VIOLENCE AGAINST RESPONDER","PEDIATRIC CPR","HOMICIDE SUICIDE VIOLENT DEATH","DANGER THREAT TO LIFE","SEXUAL VIOLENCE AGAINST RESPONDER","DISASTER_RESPONSE","MASS_CASUALTY_INCIDENT"] as const

export type TypeTraumaticEvent = typeof TypeTraumaticEvent[number]

export const TypeVehiclePowertrain = ["INTERNAL_COMBUSTION","ELECTRIC","PLUG_IN_HYBRID","HYBRID","COMPRESSED_NATURAL_GAS"] as const

export type TypeVehiclePowertrain = typeof TypeVehiclePowertrain[number]

export const TypeVents = ["MESH SCREEN <= 1/8 \"","MESH SCREEN > 1/8 \"","NO VENTS","UNSCREENED","UNKNOWN"] as const

export type TypeVents = typeof TypeVents[number]

export const TypeWindowDamage = ["SHATTERED","CRACKED","MELTED_WARPED","NO_DAMAGE"] as const

export type TypeWindowDamage = typeof TypeWindowDamage[number]

export const TypeWindowPanes = ["DOUBLE PANE","TRIPLE PANE","SINGLE PANE","NO WINDOWS","UNKNOWN"] as const

export type TypeWindowPanes = typeof TypeWindowPanes[number]

export const TypeZoning = ["RESIDENTIAL","COMMERCIAL","INDUSTRIAL","AGRICULTURAL","RURAL","MIXED_USE","INSTITUTION_PUBLIC","WUI"] as const

export type TypeZoning = typeof TypeZoning[number]
