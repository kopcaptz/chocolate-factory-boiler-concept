/* BOILER-A3: additive 1c method data. Canonical column units; no numeric defaults. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoilerCalcSchema = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'boiler-site-input-1c';
  const METHOD_DATA_PATH = 'inputs.calculation_basis.method_data';
  const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
  const N = 'number', S = 'string', B = 'boolean', SS = [S], NN = [N];
  const prov = { source_ref:S, page:S, revision:S, reviewer_role:S, status:['assumed','confirmed'], data_class:['example','site'], uncertainty:{value:N,unit:S}, approval_ref:S };
  const rec = fields => Object.assign({id:S,provenance:prov},fields);
  const point = fields => Object.assign({},fields,{provenance:prov});
  const limits = rec({id:S,analyte:S,unit:S,minimum:N,maximum:N,reference_temp_c:N,material_ref:S,rule_ref:S});
  const pipeOption = rec({inner_diameter_m:N,pressure_allow_g_bar:N,temperature_allow_c:N,material_ref:S,connection_ref:S});
  const schemas = {
    coefficients:[rec({value:N,unit:S,source_type:['norm','manufacturer','engineer','assumption','physical_reference'],applicability_ref:S,review_required:B})],
    fluid:[rec({fluid_ref:S,composition_ref:S,interpolation_method:S,pressure_domain_abs_bar:NN,points:[point({temperature_c:N,pressure_abs_bar:N,rho_kg_m3:N,cp_j_kg_k:N,mu_pa_s:N,pv_abs_bar:N,beta_per_k:N})]})],
    thermal:[rec({load_ref:S,fluid_ref:S,model:['mixed-batch-constant-cp','mixed-continuous','lumped-constant-cp'],loss_ua_w_k:N,loss_surface_c:N,ambient_c:N,product_cp_j_kg_k:N,metal_cp_j_kg_k:N,metal_initial_c:N,metal_target_c:N,water_initial_c:N,water_target_c:N,product_inlet_c:N,phase_energy_j:N,phase_model_ref:S,geometry_factor:N,water_inlet_c:N,water_outlet_c:N,delta_t_k:N,ua_w_k:N,mean_warmup_loss_w:N,hold_loss_w:N,hold_rating_conditions_ref:S,lumped_applicable:B,heat_capacity_j_k:N,quality_limit_c:N,outage_duration_s:N,transient_model:S,wall_model_ref:S})],
    routes:[rec({route_ref:S,fluid_ref:S,thermal_model:['constant-ua','cylindrical'],ua_linear_w_m_k:N,heat_loss_w:N,heat_loss_conditions_ref:S,inlet_c:N,ambient_c:N,flow_m3_h:N,alpha_in_w_m2_k:N,alpha_out_w_m2_k:N,pipe_lambda_w_m_k:N,insulation_lambda_w_m_k:N,hydraulic_model:['quadratic-head','darcy-colebrook','kv'],head_coefficient:N,roughness_m:N,zeta:N,darcy_f:N,kv_m3_h:N,kv_reference_rho_kg_m3:N,balance_available_dp_bar:N,balance_other_dp_bar:N,balance_min_dp_bar:N,balance_unit:S,balance_interpolation_method:S,balance_points:[point({kv_m3_h:N,setting:N})],pipe_options:[pipeOption],selection_rule:['minimum-inner-diameter'],maximum_pressure_loss_pa_m:N})],
    pump_curves:[rec({equipment_ref:S,fluid_ref:S,interpolation_method:S,speed_rpm:N,impeller_m:N,minimum_flow_m3_h:N,maximum_flow_m3_h:N,suction_pressure_abs_bar:N,suction_velocity_m_s:N,temperature_c:N,npsh_required_margin_m:N,npsh_required_ratio:N,operating_domain_ref:S,points:[point({flow_m3_h:N,head_m:N,npshr_m:N,electrical_kw:N})]})],
    network_cases:[rec({scenario_ref:S,family_id:S,mode:['design','cold_fill','hot_run','deadhead','makeup_failure','heat_closed','trapped','two_pumps','cooling','et_isolated'],topology_model:['simple-parallel','series-chain','pressure-paths'],fluid_ref:S,temperature_c:N,base_node_ref:S,base_pressure_g_bar:N,base_pressure_lower_g_bar:N,base_pressure_upper_g_bar:N,expansion_connected:B,pump_curve_ref:S,pump_count:N,pump_head_case:['H0','Hmax','operating','stopped'],parallel_identical_confirmed:B,pump_flow_m3_h:N,minimum_flow_strategy:S,guaranteed_boiler_flow_m3_h:N,guaranteed_pump_flow_m3_h:N,common_route_refs:SS,branch_paths:[rec({branch_ref:S,route_refs:SS,load_refs:SS})],edges:[rec({from_ref:S,to_ref:S,route_ref:S,branch_ref:S,state:['open','closed','check_blocked']})],paths:[rec({target_ref:S,elevation_m:N,base_velocity_m_s:N,target_velocity_m_s:N,pump_in_path:B,pump_head_m:N,loss_head_m:N,pressure_allow_g_bar:N,pressure_rating_temp_c:N,pressure_rating_ref:S,minimum_pressure_g_bar:N,product_pressure_g_bar:N,max_differential_bar:N,vacuum_allow_bar:N,isolated:B})],isolated_zones:[rec({load_ref:S,heated:B,relief_accessible:B,document_ref:S})],system_curve:rec({interpolation_method:S,points:[point({flow_m3_h:N,head_m:N})]})})],
    pressure_basis:rec({fluid_ref:S,gravity_m_s2:N,atmospheric_pressure_bar:N,atmospheric_range_bar:NN,reference_node_ref:S,reference_elevation_m:N,cold_pressure_g_bar:N,hot_pressure_g_bar:N,cooling_pressure_g_bar:N,minimum_air_pressure_g_bar:N,vapor_margin_bar:N,uncertainty_bar:N,temperature_upper_c:N}),
    reliefs:[rec({device_ref:S,node_ref:S,fluid_ref:S,phase:['liquid-single-phase','two-phase','steam'],temperature_c:N,backpressure_bar:N,inlet_loss_bar:N,discharge_verified:B,receiver_verified:B,transients_verified:B,certified:B,open_interval_bar:NN,setting_interval_bar:NN,required_capacity_pressure_bar:N,allowed_temperature_c:NN,allowed_backpressure_bar:NN,interpolation_method:S,points:[point({pressure_g_bar:N,capacity_m3_h:N})],family_refs:SS})],
    makeup_source:rec({model:['kv-source-envelope','tabulated-source-envelope'],fluid_ref:S,temperature_c:N,source_pressure_g_bar:N,flow_envelope_proven:B,tract_elements:[rec({kv_m3_h:N})],kv_reference_rho_kg_m3:N,downstream_range_g_bar:NN,closure_pressure_range_g_bar:NN,closure_range_proven:B,interpolation_method:S,points:[point({pressure_g_bar:N,flow_m3_h:N})],relief_ref:S,relief_path_pump_flow_independent:B,heating_power_w:N,phase:['liquid-single-phase','two-phase','steam'],close_time_s:N,measurement_uncertainty_m3:N,loss_allow_m3:N,cycle_volume_m3:N,cycle_count_limit:N,fill_flow_min_m3_h:N,fill_flow_max_m3_h:N,policy_ref:S,pulse_count:N,pulse_volume_m3:N}),
    expansion_basis:rec({model:['isothermal-two-state'],zones:[rec({component_refs:SS,cold_volume_m3:N,cold_rho_kg_m3:N,hot_rho_kg_m3:N,cold_temperature_c:N,hot_temperature_c:N})],precharge_abs_bar:N,cold_abs_bar:N,hot_abs_bar:N,reserve_m3:N,guaranteed_active_volume_m3:N,membrane_acceptance_fraction:N,membrane_temperature_min_c:N,membrane_temperature_max_c:N,precharge_interval_g_bar:NN,fill_interval_g_bar:NN,selection_rule_ref:S}),
    control_basis:rec({minimum_stage_w:N,minimum_load_w:N,minimum_on_s:N,usable_delta_t_k:N,guaranteed_active_volume_m3:N,stop_residual_j:N,stop_power_w:N,stop_delay_s:N,effective_water_volume_m3:N,hotspot_model_ref:S,hotstop_procedure_ref:S,pressure_ladders:[rec({point_ref:S,family_id:S,normal_upper_g_bar:N,trip_interval_g_bar:NN,psv_open_interval_g_bar:NN,capacity_pressure_upper_g_bar:N,local_transfer_bar:N,transfer_uncertainty_bar:N,local_allow_g_bar:N})],timers:[rec({target_ref:S,sensor_s:N,filter_s:N,logic_s:N,output_s:N,actuator_s:N,response_s:N,uncertainty_s:N,normal_response_upper_s:N,safe_budget_s:N,document_ref:S})]}),
    electrical_basis:rec({boiler_efficiency:N,power_factor:N,controls_kw:N,aux_kw:N,pump_inputs:[rec({equipment_ref:S,power_kw:N,power_basis:['input','shaft'],efficiency:N,start_current_a:N})],maximum_running_pumps:N,balanced_sinusoidal:B,cable_document_ref:S,short_circuit_document_ref:S,earthing_document_ref:S,protection_document_ref:S,supply_compatibility_ref:S}),
    reference_limits:rec({water_limits:[limits],treatment_choice:S,treatment_compatibility_ref:S,chemical_compatibility_ref:S,backflow_document_ref:S,water_approval_ref:S,model_applicability_ref:S,temperature_limit_c:N})
  };
  const labels = {coefficients:'מקדמים ומקורות',fluid:'תכונות נוזל לפי טמפרטורה',thermal:'נתוני מעבר חום ומוצר',routes:'מאפייני תוואי',pump_curves:'עקומות משאבות',network_cases:'תרחישים ורשת',pressure_basis:'בסיס לחץ וגבולות מינימום',reliefs:'יכולת שסתומי בטיחות',makeup_source:'מעטפת מקור מילוי ותקלה',expansion_basis:'בסיס מכל התפשטות',control_basis:'תחומי בדיקה ותקציבי זמן',electrical_basis:'בסיס חשמלי',reference_limits:'דרישות ומגבלות'};
  const FAMILY_SPECS = Object.keys(schemas).map((key,i)=>({key,id:'MD'+String(i+1).padStart(2,'0'),kind:Array.isArray(schemas[key])?'array':'object',label_he:labels[key],fields:Object.keys(Array.isArray(schemas[key])?schemas[key][0]:schemas[key])}));
  const FIELD_HELP = {provenance:'מקור, עמוד, מהדורה, קוד תפקיד ואי־ודאות נדרשים. reviewer_role בנקודת עקומה הוא קוד התפקיד שביצע את הדיגיטציה. confirmed הוא טענה לתיעוד, לא אימות חתימה.',points:'כל נקודה מחייבת מקור, עמוד, reviewer_role של התפקיד שביצע את הדיגיטציה ואי־ודאות משלה. אין אקסטרפולציה.',status:'assumed: לבדוק עם מהנדס. confirmed: טענת מקור שניתנת לבדיקה.',pressure_ladders:'תחומים לבדיקת תכנון בלבד; אינם ערכי בקרה.',network_cases:'תשע משפחות חובה נשמרות גם ללא נתונים. paths מתאר מסלולי לחץ מפורשים, branch_paths סדר תוואי לולאה.'};
  function validateMethodData(md,dataset) {
    const errors=[],warnings=[], ids=new Map();
    const err=(path,code,message)=>errors.push({path,code,message});
    const docs=new Set((dataset&&Array.isArray(dataset.documents)?dataset.documents:[]).map(d=>d.id));
    function walk(v,spec,path) {
      if (v===null) {if(typeof spec!=='string')err(path,'shape','Structured records, points, arrays and provenance cannot be null');return;}
      if (typeof spec==='string') {
        if(typeof v!==spec||(spec===N&&!Number.isFinite(v)))err(path,'type','Required canonical '+spec+' column');
        return;
      }
      if (Array.isArray(spec)) {
        if(typeof spec[0]==='string'&&!['string','number','boolean'].includes(spec[0])){if(!spec.includes(v))err(path,'enum','Unsupported value');return;}
        if(!Array.isArray(v)){err(path,'shape','Expected array');return;}
        if(v.length>10000){err(path,'limit','Too many records');return;}
        v.forEach((x,i)=>walk(x,spec[0],path+'['+i+']'));
        if(spec[0]===N&&(path.endsWith('_bar')||path.endsWith('_c'))&&(v.length!==2||v[0]>v[1]))err(path,'interval','Expected ordered [minimum,maximum]');
        return;
      }
      if(!object(v)){err(path,'shape','Expected structured object');return;}
      Object.keys(v).forEach(k=>{if(['__proto__','constructor','prototype'].includes(k)||!Object.prototype.hasOwnProperty.call(spec,k))err(path+'.'+k,'unknown_key','Unknown method-data column');else walk(v[k],spec[k],path+'.'+k);});
      if(Object.prototype.hasOwnProperty.call(spec,'id')) {
        if(typeof v.id!=='string'||!v.id)err(path+'.id','id','Stable method-data ID required');
        else if(ids.has(v.id))err(path+'.id','duplicate_id','Duplicate method-data ID'); else ids.set(v.id,path);
      }
      if(Object.prototype.hasOwnProperty.call(spec,'provenance')) {
        if(!object(v.provenance))err(path+'.provenance','provenance','Source/page/role/uncertainty are required');
      }
      if(spec===prov) {
        for(const k of ['source_ref','page','revision','reviewer_role','status','data_class','uncertainty'])if(v[k]===undefined||v[k]===null||v[k]==='')err(path+'.'+k,'provenance','Required provenance column');
        if(v.source_ref&&!docs.has(v.source_ref))err(path+'.source_ref','unresolved_reference','Document ID absent from documents[]');
        if(object(v.uncertainty)&&(typeof v.uncertainty.value!=='number'||v.uncertainty.value<0||!v.uncertainty.unit))err(path+'.uncertainty','uncertainty','Nonnegative uncertainty and its unit required');
        if(v.status==='confirmed'&&!v.approval_ref)warnings.push({path:path+'.approval_ref',code:'approval_claim_unverified',message:'confirmed metadata is not an authenticated signature'});
        if(v.data_class==='example'&&v.status!=='assumed')err(path+'.status','example_status','Example method data must remain assumed');
        if(v.approval_ref&&!docs.has(v.approval_ref))err(path+'.approval_ref','unresolved_reference','Approval document ID absent');
      }
      for(const [k,x]of Object.entries(v))if(typeof x==='number'){
        if(/(?:rho_kg_m3|cp_j_kg_k|mu_pa_s|gravity_m_s2|kv_m3_h|kv_reference_rho_kg_m3|efficiency|power_factor)$/.test(k)&&x<=0)err(path+'.'+k,'invalid_domain','Value must be positive');
        if(/(?:_m3_h|_volume_m3|_head_m|_power_w|_energy_j|_capacity_j_k|_ua_w_k|uncertainty_bar|_margin_bar|_margin_m)$/.test(k)&&x<0)err(path+'.'+k,'invalid_domain','Value cannot be negative');
      }
    }
    if(md===undefined)return {errors,warnings};
    if(!object(md))err(METHOD_DATA_PATH,'shape','Expected method-data object');
    else {
      Object.keys(md).forEach(k=>{if(!Object.prototype.hasOwnProperty.call(schemas,k))err(METHOD_DATA_PATH+'.'+k,'unknown_key','Only MD01–MD13 families are accepted');else walk(md[k],schemas[k],METHOD_DATA_PATH+'.'+k);});
      for(const [group,key]of [['thermal','load_ref'],['routes','route_ref'],['fluid','fluid_ref']]){const seen=new Set();(Array.isArray(md[group])?md[group]:[]).forEach((r,i)=>{if(r&&r[key]){if(seen.has(r[key]))err(METHOD_DATA_PATH+'.'+group+'['+i+'].'+key,'ambiguous_reference','Multiple method records target the same object');seen.add(r[key]);}});}
      if(Array.isArray(md.network_cases)&&md.network_cases.filter(n=>n&&n.mode==='design').length>1)err(METHOD_DATA_PATH+'.network_cases','decision_required','One explicit design revision is supported per calculation');
    }
    return {errors,warnings};
  }
  function previewMigration(dataset) {
    if(!object(dataset)||!['boiler-site-input-1b',VERSION].includes(dataset.schema_version))throw new Error('Only explicit 1b → 1c migration is supported');
    const candidate=JSON.parse(JSON.stringify(dataset)), changes=[];
    const from_version=dataset.schema_version;
    if(from_version!==VERSION){changes.push({path:'schema_version',before:from_version,after:VERSION});candidate.schema_version=VERSION;}
    function stale(v,path){if(Array.isArray(v))v.forEach((x,i)=>stale(x,path+'['+i+']'));else if(object(v)){if(['calculated','approved'].includes(v.status)&&v.validity!=='stale'){changes.push({path:path+'.validity',before:v.validity,after:'stale'});v.validity='stale';}Object.entries(v).forEach(([k,x])=>{if(object(x)||Array.isArray(x))stale(x,path+'.'+k);});}}
    stale(candidate.results,'results');
    return {candidate,changes,from_version,to_version:VERSION};
  }
  return {VERSION,METHOD_DATA_PATH,FAMILY_SPECS,FIELD_HELP,schemas,validateMethodData,previewMigration};
});
