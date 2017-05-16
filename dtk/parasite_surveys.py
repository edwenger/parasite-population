import os

from dtk.utils.core.DTKConfigBuilder import DTKConfigBuilder
from simtools.ModBuilder import ModBuilder, ModFn

from dtk.vector.input_EIR_by_site import configure_site_EIR
from dtk.utils.reports.MalariaReport import add_survey_report

from dtk.interventions.health_seeking import add_health_seeking
from dtk.interventions.malaria_drug_campaigns import add_drug_campaign

from dtk.utils.analyzers.DownloadAnalyzer import DownloadAnalyzer


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
                   birth_cohort=False,
                   static=True, pop_scale=0.1)

cb.config['parameters']['Demographics_Filenames'].append(
    'Garki_Single/immune_init/Sugungum/Garki_single_immune_init_Sugungum_x_1.0.json')

cb.set_param("Immunity_Initialization_Distribution_Type", "DISTRIBUTION_COMPLEX")

survey_day = 100 if testing else 365 + 280  # early October

add_survey_report(cb, survey_days=[survey_day],
                  reporting_interval=10 if testing else 365,
                  nreports=1)

"""
Generate a few scenarios from a list:
   1. a baseline scenario
   2. a scenario with complete treatment on positive microscopy
   3. a scenario with complete treatment on fever
"""


def baseline(cb):
    return cb.set_param('Config_Name', 'baseline')


def perfect_health_seeking(cb):
    add_health_seeking(cb, start_day=survey_day,
                       targets=[dict(trigger='NewClinicalCase', coverage=1.0, seek=1.0, rate=0.3)])
    return cb.set_param('Config_Name', 'perfect_health_seeking')


def perfect_MSAT(cb):
    add_drug_campaign(cb, campaign_type='MSAT', drug_code='DP',
                      start_days=[survey_day + 30],
                      coverage=1.0, repetitions=3, interval=60)
    return cb.set_param('Config_Name', 'perfect_MSAT')


mod_fn_list = [[ModFn(baseline)], [ModFn(perfect_health_seeking)], [ModFn(perfect_MSAT)]]
builder = ModBuilder.from_list(mod_fn_list)

run_sim_args = {'config_builder': cb,
                'exp_name': exp_name,
                'exp_builder': builder
                }

"""
Analyzer to simply copy all survey-report JSON down from all simulations
"""


class MyDownloadAnalyzer(DownloadAnalyzer):

    def __init__(self):
        super(MyDownloadAnalyzer, self).__init__(
            output_path='output',
            filenames=['output/MalariaSurveyJSONAnalyzer_Day_%d_0.json' % survey_day])

    def get_sim_folder(self, parser):
        """ Use simulation name if possible, otherwise default to less informative unique ID """
        return os.path.join(self.output_path, parser.sim_data.get('Config_Name', parser.sim_id))


analyzers = [MyDownloadAnalyzer()]