from dtk.utils.core.DTKConfigBuilder import DTKConfigBuilder
# from dtk.utils.builders.sweep import GenericSweepBuilder

from dtk.vector.input_EIR_by_site import configure_site_EIR
from dtk.utils.reports.MalariaReport import add_survey_report


exp_name = 'Parasite Population Surveys'
testing = False

"""
Construct a baseline scenario with:
   * Holoendemic Sahel initial immunity + seasonal force-of-infection
   * Survey reporter into rainy season and through following dry season
"""

cb = DTKConfigBuilder.from_defaults('MALARIA_SIM',
                                    Num_Cores=1,
                                    Simulation_Duration=365 if testing else 365*3
                                    )

configure_site_EIR(cb, 'Sugungum',
                   habitat=0.01 if testing else 1,
                   birth_cohort=False)

cb.config['parameters']['Demographics_Filenames'].append(
    'Garki_Single/immune_init/Sugungum/Garki_single_immune_init_Sugungum_x_1.0.json')

cb.set_param("Immunity_Initialization_Distribution_Type", "DISTRIBUTION_COMPLEX")

add_survey_report(cb, survey_days=[100 if testing else 365 + 280],  # early October
                  reporting_interval=10 if testing else 365,
                  nreports=1)

"""
Generate a few scenarios from a list:
   1. a baseline scenario
   2. a scenario with complete treatment on positive microscopy
   3. a scenario with complete treatment on fever
"""

# builder = GenericSweepBuilder.from_dict({'Run_Number': range(3),
#                                          '_site_': ['Namawala', 'Matsari']})


run_sim_args = {'config_builder': cb,
                'exp_name': exp_name,
                # 'exp_builder': builder
                }

"""
Analyzer to simply copy all survey-report JSON down from all simulations
"""

analyzers = []